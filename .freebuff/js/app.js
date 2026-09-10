/* ═════════════════════════════════ modules bootstrap ═══════ */
(function () {
  "use strict";

  window.addEventListener("DOMContentLoaded", function () {
    if (window.AuroraUI) AuroraUI.init();
    if (window.AuroraArt) AuroraArt.init();
    if (window.AuroraScene) {
      var ok = AuroraScene.init();
      if (ok && AuroraScene.quality === "low") {
        var st = document.querySelector(".quality-state");
        if (st) st.textContent = "LO";
      }
    }
    document.body.classList.add("app-ready");
  });
})();
