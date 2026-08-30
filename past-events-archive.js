// Past-events archive renderer for open-events.html / english-events.html.
// Fetches /api/past-events (served from the "Ezra Events - Site Archive" monday
// board) and rebuilds the #pastSliderTrack cards from it. The hardcoded cards in
// the HTML stay as the fallback: if the fetch fails, returns nothing, or the API
// isn't configured yet, the page is exactly what it is today.
//
// Wired via <script src="past-events-archive.js" data-lang="he|en" defer> before
// </body> on both pages. The pages bind card clicks by delegation and the slider
// arrows read card width live, so replacing the track needs no rebinding.
(function () {
  var script = document.currentScript;
  var lang = (script && script.getAttribute("data-lang")) || "he";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function card(ev) {
    var article = document.createElement("article");
    article.className = "past-slide-card js-open-past";
    article.setAttribute("role", "button");
    article.setAttribute("tabindex", "0");
    article.setAttribute("aria-label", (lang === "he" ? "פרטי הערב: " : "Event details: ") + ev.title);
    if (ev.badgeClass) article.setAttribute("data-badge-class", ev.badgeClass);
    // The modal shows one link button: the artist's own page when we have it,
    // otherwise the Instagram post for the evening.
    var link = ev.artistLink || ev.instagram;
    if (link) {
      article.setAttribute("data-link", link);
      article.setAttribute("data-link-text", ev.artistLink
        ? ev.artistLink.replace(/^https?:\/\//, "").replace(/\/$/, "")
        : "Instagram");
    }
    article.innerHTML =
      '<div class="past-slide-card__img">' +
        '<img src="' + esc(ev.image) + '" alt="' + esc(ev.title) + '" loading="lazy" />' +
        (ev.type ? '<span class="past-slide-card__tag">' + esc(ev.type) + "</span>" : "") +
      "</div>" +
      '<div class="past-slide-card__body">' +
        '<div class="past-slide-card__date">' + esc(ev.dateDisplay || "") + "</div>" +
        '<h4 class="past-slide-card__title">' + esc(ev.title) + "</h4>" +
        '<p class="past-slide-card__desc">' + esc(ev.description) + "</p>" +
      "</div>";
    return article;
  }

  // The live origin is GitHub Pages (static only), so this endpoint lives on the
  // ezra-lead worker alongside the availability feed, not under /api/.
  fetch("https://ezra-lead.yeheli.workers.dev/?pastEvents=1")
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      var events = data && data[lang];
      if (!events || !events.length) return; // keep hardcoded fallback
      var track = document.getElementById("pastSliderTrack");
      if (!track) return;
      track.innerHTML = "";
      events.forEach(function (ev) { track.appendChild(card(ev)); });
      // Let the page's slider/modal code rebind to the new cards.
      document.dispatchEvent(new CustomEvent("pastEventsRendered", { detail: { count: events.length } }));
    })
    .catch(function () { /* fallback stays */ });
})();
