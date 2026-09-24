"""Minimal OLE/CFB reader + MS-OVBA decompressor to dump VBA module source."""
import struct, sys, zipfile, os

def read_cfb(data):
    hdr = data[:512]
    sector_shift = struct.unpack_from('<H', hdr, 0x1E)[0]
    mini_shift = struct.unpack_from('<H', hdr, 0x20)[0]
    ssz = 1 << sector_shift
    mssz = 1 << mini_shift
    num_fat = struct.unpack_from('<I', hdr, 0x2C)[0]
    dir_start = struct.unpack_from('<I', hdr, 0x30)[0]
    mini_cutoff = struct.unpack_from('<I', hdr, 0x38)[0]
    minifat_start = struct.unpack_from('<I', hdr, 0x3C)[0]
    difat_start = struct.unpack_from('<I', hdr, 0x44)[0]
    num_difat = struct.unpack_from('<I', hdr, 0x48)[0]
    difat = list(struct.unpack_from('<109I', hdr, 0x4C))
    def sector(i):
        off = (i + 1) * ssz
        return data[off:off + ssz]
    s = difat_start
    for _ in range(num_difat):
        sec = sector(s)
        vals = struct.unpack('<%dI' % (ssz // 4), sec)
        difat.extend(vals[:-1]); s = vals[-1]
    fat = []
    for i in difat[:num_fat]:
        fat.extend(struct.unpack('<%dI' % (ssz // 4), sector(i)))
    def chain(start):
        out = []; s = start
        while s < 0xFFFFFFFA:
            out.append(s); s = fat[s]
        return out
    def read_stream(start):
        return b''.join(sector(i) for i in chain(start))
    dirdata = read_stream(dir_start)
    entries = []
    for i in range(len(dirdata) // 128):
        e = dirdata[i*128:(i+1)*128]
        nlen = struct.unpack_from('<H', e, 0x40)[0]
        name = e[:max(nlen-2,0)].decode('utf-16-le', 'ignore')
        typ = e[0x42]
        left, right, child = struct.unpack_from('<III', e, 0x44)
        start = struct.unpack_from('<I', e, 0x74)[0]
        size = struct.unpack_from('<Q', e, 0x78)[0] & 0xFFFFFFFF
        entries.append(dict(name=name, type=typ, left=left, right=right, child=child, start=start, size=size))
    root = entries[0]
    ministream = read_stream(root['start']) if root['start'] < 0xFFFFFFFA else b''
    minifat = []
    if minifat_start < 0xFFFFFFFA:
        mf = read_stream(minifat_start)
        minifat = list(struct.unpack('<%dI' % (len(mf)//4), mf))
    def read_entry(e):
        if e['size'] < mini_cutoff and e['type'] == 2:
            out = []; s = e['start']
            while s < 0xFFFFFFFA:
                out.append(ministream[s*mssz:(s+1)*mssz]); s = minifat[s]
            return b''.join(out)[:e['size']]
        return read_stream(e['start'])[:e['size']]
    # build paths
    paths = {}
    def walk(idx, prefix):
        if idx == 0xFFFFFFFF or idx >= len(entries): return
        e = entries[idx]
        walk(e['left'], prefix); walk(e['right'], prefix)
        p = prefix + '/' + e['name']
        paths[p] = e
        if e['child'] != 0xFFFFFFFF:
            walk(e['child'], p)
    walk(root['child'], '')
    return paths, read_entry

def decompress(buf):
    if not buf or buf[0] != 1:
        raise ValueError('bad signature')
    out = bytearray(); pos = 1
    while pos < len(buf):
        hdr = struct.unpack_from('<H', buf, pos)[0]; pos += 2
        size = (hdr & 0x0FFF) + 3
        compressed = (hdr >> 15) & 1
        end = min(pos - 2 + size, len(buf))
        chunk_start = len(out)
        if not compressed:
            out += buf[pos:pos+4096]; pos += 4096; continue
        while pos < end:
            flags = buf[pos]; pos += 1
            for bit in range(8):
                if pos >= end: break
                if not (flags >> bit) & 1:
                    out.append(buf[pos]); pos += 1
                else:
                    tok = struct.unpack_from('<H', buf, pos)[0]; pos += 2
                    dlen = len(out) - chunk_start
                    bc = max((dlen - 1).bit_length(), 4)
                    lmask = 0xFFFF >> bc
                    length = (tok & lmask) + 3
                    off = (tok >> (16 - bc)) + 1
                    for _ in range(length):
                        out.append(out[-off])
    return bytes(out)

def parse_dir_stream(d):
    """Return list of (module_name, stream_name, text_offset)."""
    mods = []; pos = 0; cur = {}
    while pos + 6 <= len(d):
        rid, size = struct.unpack_from('<HI', d, pos); pos += 6
        if rid == 0x0009:  # PROJECTVERSION has fixed size 6 not 'size'
            pos += 6 - 0 if False else 0
        val = d[pos:pos+size]
        if rid == 0x0009:
            val = d[pos:pos+6]; pos += 6
        else:
            pos += size
        if rid == 0x0019:
            cur = {'name': val.decode('cp1251', 'ignore')}
        elif rid == 0x001A:
            cur['stream'] = val.decode('cp1251', 'ignore')
        elif rid == 0x0031:
            cur['offset'] = struct.unpack('<I', val)[0]
        elif rid == 0x002B:
            mods.append(cur); cur = {}
    return mods

if __name__ == '__main__':
    src = sys.argv[1]; outdir = sys.argv[2]
    os.makedirs(outdir, exist_ok=True)
    data = zipfile.ZipFile(src).read('xl/vbaProject.bin')
    paths, read_entry = read_cfb(data)
    dirkey = [p for p in paths if p.upper().endswith('/VBA/DIR')][0]
    base = dirkey.rsplit('/', 1)[0]
    d = decompress(read_entry(paths[dirkey]))
    mods = parse_dir_stream(d)
    for m in mods:
        key = [p for p in paths if p.rsplit('/',1)[0] == base and p.rsplit('/',1)[1].lower() == m['stream'].lower()]
        if not key: print('missing', m); continue
        raw = read_entry(paths[key[0]])
        code = decompress(raw[m['offset']:]).decode('cp1251', 'replace')
        fn = os.path.join(outdir, m['name'] + '.bas')
        open(fn, 'w', encoding='utf-8').write(code)
        print(m['name'], len(code))
