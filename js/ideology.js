/* Approximate mapping: ideology / party / alignment labels -> (econ, social) on the -10..+10 board.
   econ: -10 state-led .. +10 market-led. social: -10 libertarian .. +10 authoritarian.
   These are rough, hand-written anchors for a LOW-confidence "estimate from public data". They are not scores. */
(function () {
  const P = window.P;
  // [regex on lower-cased label, econ, social, display]
  P.IDEOLOGY_MAP = [
    [/anarcho.?capital/, 9, -9.5, 'Anarcho-capitalism'],
    [/anarcho.?(communis|syndical)|social anarch|anarchist communis/, -8, -9, 'Social anarchism'],
    [/libertarian socialis|left.?libertarian|mutualis|libertarian municipal/, -7, -8, 'Libertarian socialism'],
    [/individualist anarch|anarchis/, -2, -9, 'Anarchism'],
    [/objectivis|minarchis|right.?libertarian|libertarianism|libertarian/, 8, -6, 'Libertarianism'],
    [/classical liberal|economic liberal|laissez/, 7, -4, 'Classical liberalism'],
    [/neoliberal/, 6, -1, 'Neoliberalism'],
    [/ordoliberal|social market/, 2, -1, 'Social market economy'],
    [/social liberal|new liberal/, -2, -3, 'Social liberalism'],
    [/liberal conservat|conservative liberal/, 4, 0, 'Liberal conservatism'],
    [/liberal democra|liberalism|liberal/, 1, -3, 'Liberalism'],
    [/national conservat/, 3, 6, 'National conservatism'],
    [/neoconservat|paleoconservat/, 5, 5, 'Neoconservatism'],
    [/social conservat|religious conservat|traditionalis/, 2, 6, 'Social conservatism'],
    [/fiscal conservat|supply.?side|thatcher|reagan/, 8, 2, 'Fiscal conservatism'],
    [/one.?nation|christian democra|christian-democra/, 1, 3, 'Christian democracy'],
    [/gaullis/, 1, 3, 'Gaullism'],
    [/conservatism|conservative/, 5, 3, 'Conservatism'],
    [/national bolshev|stalinis|marxism.?leninism|maoism|juche/, -9, 8, 'Marxism–Leninism'],
    [/trotsky/, -8, -1, 'Trotskyism'],
    [/communis/, -9, 4, 'Communism'],
    [/marxis/, -8, 1, 'Marxism'],
    [/eco.?socialis/, -7, -2, 'Eco-socialism'],
    [/democratic socialis/, -6, -2, 'Democratic socialism'],
    [/market socialis|syndical/, -6, -5, 'Market socialism'],
    [/social democra|labourism|laborism|welfare state/, -4, -1, 'Social democracy'],
    [/socialis/, -7, 0, 'Socialism'],
    [/keynes/, -2, 0, 'Keynesianism'],
    [/progressiv/, -4, -3, 'Progressivism'],
    [/green politic|environmentalis|green/, -5, -3, 'Green politics'],
    [/feminis/, -3, -3, 'Feminism'],
    [/pacifis/, -2, -5, 'Pacifism'],
    [/nazism|national socialism/, 0, 10, 'National socialism'],
    [/fascis|falang/, 2, 9, 'Fascism'],
    [/corporatis/, 2, 7, 'Corporatism'],
    [/ba.?athis/, -3, 7, "Ba'athism"],
    [/peronis/, -3, 4, 'Peronism'],
    [/islamis|theocra/, 1, 8, 'Islamism'],
    [/zionis/, 2, 3, 'Zionism'],
    [/absolutis|monarchis|royalis/, 3, 6, 'Monarchism'],
    [/authoritarian|totalitari|military dictator|dictatorship/, 0, 9, 'Authoritarianism'],
    [/militaris/, 2, 7, 'Militarism'],
    [/right.?wing populis|national populis|populism/, 2, 5, 'Populism'],
    [/left.?wing populis/, -5, 2, 'Left-wing populism'],
    [/ultranationalis|nationalis|patriotis/, 3, 5, 'Nationalism'],
    [/pan.?africanis|anti.?colonial|decoloniz/, -3, 1, 'Anti-colonialism'],
    [/third way/, 0, 0, 'Third Way'],
    [/centris|moderat/, 0, 0, 'Centrism'],
    [/republicanis/, 0, -2, 'Republicanism'],
    [/secularis/, 0, -3, 'Secularism'],
    [/abolition|civil rights|human rights/, -2, -4, 'Rights movements'],
    [/democra/, 0, -3, 'Democracy'],
  ];
  // party label -> anchors. English labels as they appear on Wikidata; deliberately broad and approximate.
  P.PARTY_MAP = [
    [/libertarian party/, 8, -6, 'Libertarian parties'],
    [/communist|bolshevik|workers.? party of korea|party of labour/, -9, 6, 'Communist parties'],
    [/national socialist|nazi|fascist|falange/, 1, 10, 'National socialist / fascist parties'],
    [/socialist workers|socialist party|workers.? party|labor party of|labour party|labour|worker/, -5, -1, 'Labour / socialist parties'],
    [/social democrat|sozialdemokrat|spd|democratic socialists/, -4, -1, 'Social democratic parties'],
    [/green|ecolog|greens/, -5, -3, 'Green parties'],
    [/liberal democrat|liberal party|free democratic|fdp|d66|liberal/, 2, -3, 'Liberal parties'],
    [/christian democrat|christian social|cdu|csu|people.s party|popular party|centre party|center party/, 2, 3, 'Christian democratic / centre parties'],
    [/democratic.republican|jeffersonian/, 0, -3, 'Democratic-Republican Party'],
    [/federalist|whig/, 3, 3, 'Federalist / Whig'],
    [/democratic party|democrat/, -3, -1, 'Democratic Party (US)'],
    [/republican party|grand old party|gop/, 6, 3, 'Republican Party (US)'],
    [/tea party/, 8, 2, 'Tea Party'],
    [/conservative|tory|tories|moderate party/, 5, 3, 'Conservative parties'],
    [/national rally|national front|front national|alternative for germany|afd|brexit|reform uk|freedom party|lega|league|fidesz|law and justice|vox|nationalist/, 3, 6, 'National-conservative / nationalist parties'],
    [/bharatiya janata|bjp/, 2, 5, 'Bharatiya Janata Party'],
    [/indian national congress|congress party/, -3, 0, 'Indian National Congress'],
    [/likud/, 5, 5, 'Likud'],
    [/kuomintang/, 3, 5, 'Kuomintang'],
    [/ba.?ath/, -3, 7, "Ba'ath parties"],
    [/independent|non.?partisan|no party/, null, null, null],
  ];
  // political alignment (P1387) -> econ only
  P.ALIGN_MAP = [
    [/far.?left|extreme.?left/, -8], [/centre.?left|center.?left/, -3], [/left.?wing|^left$/, -5],
    [/far.?right|extreme.?right/, 8], [/centre.?right|center.?right/, 3], [/right.?wing|^right$/, 5], [/centrism|centre|center/, 0],
  ];
  /** Look up a list of label strings and return signals [{kind,label,name,x,y|null}] */
  P.matchSignals = function (kind, labels) {
    const table = kind === 'ideology' ? P.IDEOLOGY_MAP : kind === 'party' ? P.PARTY_MAP : null;
    const out = [];
    labels.forEach(label => {
      const l = String(label).toLowerCase();
      if (kind === 'align') {
        for (const [re, x] of P.ALIGN_MAP) if (re.test(l)) { out.push({ kind, label, name: label, x, y: null }); break; }
        return;
      }
      for (const [re, x, y, name] of table) {
        if (re.test(l)) { if (x != null) out.push({ kind, label, name, x, y }); break; }
      }
    });
    return out;
  };
  /** Combine signals into an estimate. Returns {x,y,rx,ry,notes,signals} or null when there is nothing usable on BOTH axes. */
  P.combineSignals = function (signals) {
    if (!signals.length) return null;
    const w = s => s.kind === 'ideology' ? 1 : s.kind === 'party' ? 0.8 : 0.6;
    const ex = signals.filter(s => s.x != null), sy = signals.filter(s => s.y != null);
    const avg = (arr, key) => arr.reduce((a, s) => a + s[key] * w(s), 0) / arr.reduce((a, s) => a + w(s), 0);
    const out = { signals, notes: [] };
    out.x = ex.length ? avg(ex, 'x') : null; out.y = sy.length ? avg(sy, 'y') : null;
    const spreadX = ex.length > 1 ? P.sd(ex.map(s => s.x)) / 2 : 0, spreadY = sy.length > 1 ? P.sd(sy.map(s => s.y)) / 2 : 0;
    out.rx = 3.4 + Math.min(spreadX, 2); out.ry = 3.4 + Math.min(spreadY, 2);
    return out;
  };
})();
