// Cenozoic — общий скрипт сайта
(function () {
  "use strict";

  // Простой набор геометрических иконок (без внешних библиотек/CDN)
  var ICON_SHAPES = {
    droplet: '<path d="M12 2s7 8.5 7 13a7 7 0 1 1-14 0c0-4.5 7-13 7-13z"/>',
    layers: '<rect x="3" y="4" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="16" width="18" height="4" rx="1"/>',
    waves: '<path d="M2 7.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 13.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 19.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
    "cloud-rain": '<path d="M6 15a4 4 0 0 1 .7-7.94A5.5 5.5 0 0 1 17.5 9.5 3.5 3.5 0 0 1 17 15H6z"/><line x1="8" y1="18" x2="8" y2="21"/><line x1="12" y1="18" x2="12" y2="21"/><line x1="16" y1="18" x2="16" y2="21"/>',
    shield: '<path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z"/>',
    "shield-check": '<path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z"/><polyline points="9,12 11,14 15,10"/>',
    flask: '<path d="M9 3h6"/><path d="M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-3L14 9V3"/><line x1="8" y1="15" x2="16" y2="15"/>',
    ruler: '<rect x="3" y="8" width="18" height="8" rx="1.5"/><line x1="7" y1="8" x2="7" y2="12"/><line x1="11" y1="8" x2="11" y2="12"/><line x1="15" y1="8" x2="15" y2="12"/><line x1="19" y1="8" x2="19" y2="12"/>',
    compass: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><line x1="3" y1="12" x2="21" y2="12"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><line x1="9" y1="4" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="20"/>',
    combine: '<line x1="3" y1="6" x2="9" y2="6"/><line x1="3" y1="12" x2="9" y2="12"/><line x1="3" y1="18" x2="9" y2="18"/><path d="M9 6L15 12L9 18"/><line x1="15" y1="12" x2="21" y2="12"/>',
    swap: '<line x1="3" y1="8" x2="17" y2="8"/><polyline points="13,4 17,8 13,12"/><line x1="21" y1="16" x2="7" y2="16"/><polyline points="11,20 7,16 11,12"/>',
    "check-circle": '<circle cx="12" cy="12" r="9"/><polyline points="8,12.5 11,15.5 16,9"/>',
    "arrow-right": '<line x1="4" y1="12" x2="20" y2="12"/><polyline points="14,6 20,12 14,18"/>',
    "chevron-right": '<polyline points="9,5 16,12 9,19"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3,7 12,13 21,7"/>',
    send: '<polygon points="3,11 21,3 13,21 11,13 3,11"/>',
    menu: '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>',
    x: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17.5" cy="9" r="2.3"/><path d="M15.7 14.2c2.6.5 4.4 2.6 4.8 5.8"/>',
    building: '<rect x="5" y="3" width="14" height="18" rx="1"/><rect x="8" y="6.5" width="2" height="2"/><rect x="14" y="6.5" width="2" height="2"/><rect x="8" y="11" width="2" height="2"/><rect x="14" y="11" width="2" height="2"/><rect x="8" y="15.5" width="2" height="2"/><rect x="14" y="15.5" width="2" height="2"/>',
    "graduation-cap": '<path d="M12 3 2 8l10 5 10-5-10-5z"/><path d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5"/><line x1="22" y1="8" x2="22" y2="14"/>',
    factory: '<path d="M3 21V11l6 4v-4l6 4v-4l6 4v6H3z"/><rect x="6" y="15" width="2" height="2"/><rect x="11" y="15" width="2" height="2"/><rect x="16" y="15" width="2" height="2"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/>',
    zap: '<polygon points="13,2 4,14 11,14 10,22 20,9 13,9"/>',
    database: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/><path d="M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    "trending-up": '<polyline points="3,17 9,11 13,15 21,6"/><polyline points="15,6 21,6 21,12"/>',
    award: '<circle cx="12" cy="8" r="5"/><path d="M9 12.5 7 21l5-3 5 3-2-8.5"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2h-4a3 3 0 0 0 0 6h4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/><circle cx="16" cy="12" r="1" fill="currentColor" stroke="none"/>',
    globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><line x1="3" y1="12" x2="21" y2="12"/>',
    landmark: '<line x1="4" y1="21" x2="20" y2="21"/><line x1="5" y1="10" x2="5" y2="18"/><line x1="9" y1="10" x2="9" y2="18"/><line x1="15" y1="10" x2="15" y2="18"/><line x1="19" y1="10" x2="19" y2="18"/><polygon points="12,2 21,8 3,8"/>',
    "circle-dot": '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/>',
    wand: '<path d="M4 20 15 9"/><path d="M13 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z"/><line x1="19" y1="14" x2="19" y2="18"/><line x1="17" y1="16" x2="21" y2="16"/>',
    "list-function": '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/>',
    sigma: '<path d="M9 21V9a4 4 0 0 1 4-4h2"/><line x1="6" y1="12" x2="12" y2="12"/>'
  };

  function applyIcons() {
    var nodes = document.querySelectorAll("[data-icon]");
    nodes.forEach(function (el) {
      var name = el.getAttribute("data-icon");
      var shape = ICON_SHAPES[name];
      if (!shape) return;
      el.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        shape +
        "</svg>";
    });
  }
  applyIcons();

  // Мобильное меню
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var isOpen = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Подсветка активного пункта меню по текущему файлу
  var path = (location.pathname.split("/").pop() || "index.html");
  document.querySelectorAll(".nav-links a[href]").forEach(function (a) {
    var href = a.getAttribute("href").split("#")[0];
    if (href === path || (path === "" && href === "index.html")) {
      a.classList.add("active");
    }
  });

  // Плавное появление блоков при прокрутке (прогрессивное усиление —
  // прячем блоки только после того, как подтвердили, что умеем их проявлять)
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    document.documentElement.classList.add("js");
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });

    // Страховка: если по какой-то причине наблюдатель не сработал
    // (например, элемент скрыт другим стилем), не оставляем блок невидимым.
    setTimeout(function () {
      revealEls.forEach(function (el) { el.classList.add("in"); });
    }, 2500);
  }

  // Текущий год в подвале
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
