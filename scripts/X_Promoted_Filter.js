/*
 * X For You promoted-post filter for Shadowrocket
 * JSON timeline responses only. No telemetry, no external calls.
 * Preserves ordinary entries, control entries, and pagination cursors.
 */
(function () {
  try {
    if (!$response || typeof $response.body !== "string" ||
        $response.body.length === 0 ||
        !/(promoted-tweet-|promotedMetadata|promoted_metadata|UrtTimelineRtbImageAd|PromotedDismissAd|PromotedAdsInfo|PromotedReportAd)/.test($response.body)) {
      $done({});
      return;
    }
    var data = JSON.parse($response.body);
    var count = 0;
    function promoted(entry) {
      if (!entry || typeof entry !== "object") return false;
      var id = entry.entryId || entry.entry_id || "";
      if (typeof id === "string" &&
          (/^promoted-tweet-\d+(?:-|$)/.test(id) ||
           /^conversationthread-\d+-promoted-tweet-\d+(?:-|$)/.test(id) ||
           /^search-conversation-\d+-promoted-tweet-\d+(?:-|$)/.test(id))) return true;
      var content = entry.content || {};
      if (content.__typename === "UrtTimelineRtbImageAd" ||
          content.entryType === "UrtTimelineRtbImageAd" ||
          entry.__typename === "UrtTimelineRtbImageAd") return true;
      var item = content.itemContent || content;
      if (item.promotedMetadata || item.promoted_metadata ||
          item.adMetadata || item.ad_metadata || item.advertising_metadata) return true;
      var cc = item.clientEventInfo && item.clientEventInfo.component;
      if (typeof cc === "string" && /^promoted-(?:tweet|trend)(?:-|$)/.test(cc)) return true;
      return false;
    }
    function filterEntries(array) {
      if (!Array.isArray(array)) return array;
      return array.filter(function (e) {
        if (promoted(e)) { count++; return false; }
        return true;
      });
    }
    function visit(node, depth) {
      if (!node || depth > 18 || typeof node !== "object") return;
      if (Array.isArray(node)) {
        for (var j = 0; j < node.length; j++) visit(node[j], depth + 1);
        return;
      }
      if (Array.isArray(node.entries)) node.entries = filterEntries(node.entries);
      if (Array.isArray(node.entry)) node.entry = filterEntries(node.entry);
      // Timeline module items are entries wrapped as items; filter only explicit ad markers
      if (Array.isArray(node.items)) node.items = filterEntries(node.items);
      for (var key in node) {
        if (Object.prototype.hasOwnProperty.call(node, key) &&
            key !== "entries" && key !== "entry" && key !== "items") {
          visit(node[key], depth + 1);
        }
      }
    }
    visit(data, 0);
    if (count) $done({body: JSON.stringify(data)});
    else $done({});
  } catch (e) { $done({}); }
})();
