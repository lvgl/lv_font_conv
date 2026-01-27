(function () {
  const statusEl = document.getElementById('status');
  const detailsEl = document.getElementById('details');

  function fail(msg, extra) {
    statusEl.textContent = 'FAIL';
    statusEl.className = 'fail';
    detailsEl.textContent = msg + (extra ? '\n' + extra : '');
  }

  function ok(msg, extra) {
    statusEl.textContent = 'OK';
    statusEl.className = 'ok';
    detailsEl.textContent = msg + (extra ? '\n' + extra : '');
  }

  try {
    if (!window.lv_font_conv) {
      fail('Global "lv_font_conv" not found. Did the bundle load?');
      return;
    }

    const api = window.lv_font_conv;

    if (typeof api.convertBrowser !== 'function') {
      fail('The "convertBrowser" is missing or not a function.');
      return;
    }

    if (!Array.isArray(api.formats) || api.formats.length === 0) {
      fail('The "formats" is missing or empty.');
      return;
    }

    const keys = Object.keys(api).sort();
    ok('Basic API surface looks good.', 'Exported keys: ' + keys.join(', '));
  } catch (err) {
    fail('Unhandled error while running smoke test.', String(err && err.stack ? err.stack : err));
  }
})();
