/* https — world map of strangers (ported from design/world-map.html). Needs d3 + topojson-client. */
(function () {
  var host = document.querySelector('[data-map]');
  if (!host || typeof d3 === 'undefined' || typeof topojson === 'undefined') return;
  (async function () {
    var svg = d3.select(host);
    var projection = d3.geoNaturalEarth1().fitExtent([[8, 8], [952, 452]], { type: 'Sphere' });
    var path = d3.geoPath(projection);
    var topo;
    try {
      topo = await (await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json')).json();
    } catch (e) { return; }
    var land = topojson.feature(topo, topo.objects.countries);
    svg.append('path').datum({ type: 'Sphere' }).attr('d', path).attr('fill', 'none').attr('stroke', 'rgba(236,233,227,.14)');
    svg.append('g').selectAll('path').data(land.features).join('path')
      .attr('d', path).attr('fill', '#54504a').attr('stroke', '#2b2926').attr('stroke-width', .5);
    // strangers: [lon, lat]
    var spots = [[4.9, 52.37], [-73.94, 40.73], [139.69, 35.68], [-0.13, 51.5], [2.35, 48.86], [13.4, 52.52], [-118.24, 34.05], [126.98, 37.57], [151.2, -33.87], [-43.17, -22.9], [-99.13, 19.43], [28.98, 41.01], [77.2, 28.6], [103.82, 1.35], [18.42, -33.92], [-79.38, 43.65], [37.62, 55.75], [121.47, 31.23], [-58.38, -34.6], [31.24, 30.04]];
    var g = svg.append('g');
    g.selectAll('circle').data(spots).join('circle')
      .attr('cx', function (d) { return projection(d)[0]; })
      .attr('cy', function (d) { return projection(d)[1]; })
      .attr('r', 2.2).attr('fill', '#ece9e3');
    var ring = svg.append('circle').attr('class', 'map-ring').attr('r', 3);
    var i = 0;
    var move = function () { var p = projection(spots[i % spots.length]); ring.attr('cx', p[0]).attr('cy', p[1]); i++; };
    move(); setInterval(move, 6000);
  })();
})();
