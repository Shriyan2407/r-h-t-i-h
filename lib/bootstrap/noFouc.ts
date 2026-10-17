/**
 * Runs inline before first paint on every page: migrates browser storage keys from earlier product names
 * (keeping saved portfolios/settings) and applies the saved theme without a flash.
 */
export const noFOUCScript = `
(function(){
  try {
    // One-time migration of storage keys from earlier product names (keeps users' saved data).
    var moves = [['mkb-theme','equitylens-theme'],['rhtih-theme','equitylens-theme'],
                 ['rhtih_portfolio','equitylens_portfolio'],['rhtih_recent_tickers','equitylens_recent_tickers']];
    for (var i = 0; i < moves.length; i++) {
      var v = localStorage.getItem(moves[i][0]);
      if (v !== null && localStorage.getItem(moves[i][1]) === null) localStorage.setItem(moves[i][1], v);
      if (v !== null) localStorage.removeItem(moves[i][0]);
    }
    var t = localStorage.getItem('equitylens-theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  } catch(e) {}
})();
`;
