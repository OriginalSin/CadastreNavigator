angular.module('starter.directives', [])

.directive('map', function() {
  return {
    restrict: 'E',
    scope: {
      onCreate: '&'
    },
    link: function ($scope, $element, $attr) {
      function initialize() {
		var map = L.map($element[0], {
			attributionControl: false,
			zoomControl: false,
			minZoom: 1,
			maxZoom: 21,
			zoom: 10,
			center: [55.380280, 36.511688]
		});
		$scope.onCreate({map: map});
		ionic.Platform.ready(function(){
			// will execute when device is ready, or immediately if the device is already ready.
			map.platform = {
				deviceInformation: ionic.Platform.device(),
				// isWebView: ionic.Platform.isWebView(),
				// isWindowsPhone: ionic.Platform.isWindowsPhone(),
				isIPad: ionic.Platform.isIPad(),
				isIOS: ionic.Platform.isIOS(),
				isAndroid: ionic.Platform.isAndroid(),
				currentPlatform: ionic.Platform.platform(),
				currentPlatformVersion: ionic.Platform.version()
			};
		});

        var prefix = 'rosreestr.ru/arcgis/rest/services/Cadastre/Cadastre/MapServer/export',
            cadastre = 'http://{s}.maps.' + prefix,
            pkk5 = 'http://pkk5.' + prefix;
        var wmsOpt = {
            dpi: 96,
            bboxSR: 102100,
            imageSR: 102100,
            size: '1024,1024',
            format: 'PNG32',
            transparent:true,
            f: 'image',
            tileSize: 1024,
            maxZoom: 21,
            zIndex: 3000112
        };
		L.gmx.loadMap('CE81480280D8489586E12BDF7358E182', {leafletMap: map, setZIndex: true, hostName: 'maps.kosmosnimki.ru', apiKey: 'E5FB6CCB5D23B5E119D2F1B26BCC57BD'}).then(function(gmxMap) {
			var blm = map.gmxBaseLayersManager;
				mapProp = gmxMap.properties;
			blm.initDefaults().then(function() {
				var baseLayers = mapProp.BaseLayers,
					currentID = mapProp.currentID || baseLayers[0];

                // blm.add('Google', new L.Google());
                // baseLayers.unshift('Google');

                var esri = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?blankTile=false', {
                    maxZoom: 23,
                    maxNativeZoom: 17
                });
                blm.add('Esri', {
                    layers: [esri]
                });
                baseLayers.unshift('Esri');

				blm.setActiveIDs(baseLayers);
				if (currentID) blm.setCurrentID(currentID);
			});

			L.control.gmxLayers(blm).addTo(map)
			map.gmxControlsManager.init({
                gmxDrawing: null,
                gmxLocation: {scaleFormat: 'text'}
            });

            var cadastrePkk5 = L.tileLayer.wms(
                pkk5,
                L.Util.extend({}, wmsOpt, {layers: 'show:0,1,2,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,23,24,37,36,25,26,27,28,29,30,31'})
            );
			map.gmxLayersControl.addOverlay(cadastrePkk5, 'pkk5 - Росреестр');
            var cadastreWMS = L.tileLayer.wms(
                cadastre,
                L.Util.extend({}, wmsOpt, {})
            );
			map.gmxLayersControl.addOverlay(cadastreWMS, 'Росреестр');
		});

		var popup = null,
            overlays = {};
        var cadastreServer = 'http://pkk5.rosreestr.ru/api/features/';
        var utils = {
            getRequestParams: function(type, layer, extend) {
                var out = {
                    options: { callbackParamName: 'callback' }
                };
            },

            getFeatureExtent: function(attr, lmap) {
                var R = 6378137,
                    crs = L.Projection.SphericalMercator,
                    bounds = lmap.getPixelBounds(),
                    ne = lmap.options.crs.project(lmap.unproject(bounds.getTopRight())),
                    sw = lmap.options.crs.project(lmap.unproject(bounds.getBottomLeft())),
                    latLngBounds = L.latLngBounds(
                        crs.unproject(L.point(attr.extent.xmin, attr.extent.ymin).divideBy(R)),
                        crs.unproject(L.point(attr.extent.xmax, attr.extent.ymax).divideBy(R))
                    );
                
                return {
                    id: attr.attrs.id,
                    type: attr.type,
                    size: [bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y],
                    bbox: [sw.x, sw.y, ne.x, ne.y],
                    latlng: crs.unproject(L.point(attr.center.x, attr.center.y).divideBy(R)),
                    latLngBounds: latLngBounds
                };
            },
            setOverlay: function(attr) {
                var ids = attr.type === 5 ? [0, 1 , 2, 3, 4, 5] : [6, 7],
                    params = {
                        size: attr.size.join(','),
                        bbox: attr.bbox.join(','),
                        layers: 'show:' + ids.join(','),
                        layerDefs: '{' + ids.map(function(nm) {
                            return '\"' + nm + '\":\"ID = \'' + attr.id + '\'"'
                        }).join(',') + '}',
                        format: 'png32',
                        dpi: 96,
                        transparent: 'true',
                        imageSR: 102100,
                        bboxSR: 102100
                    },
                    imageUrl = 'http://pkk5.rosreestr.ru/arcgis/rest/services/Cadastre/CadastreSelected/MapServer/export?f=image';

                for (var key in params) {
                    imageUrl += '&' + key + '=' + params[key];
                }
                return new L.ImageOverlay(imageUrl, map.getBounds(), {opacity: 0.5});
            }
        };

		map.on('click', function(ev) {
            var latlng = ev.latlng || map.getCenter();
			if (popup && map.hasLayer(popup)) { map.removeLayer(popup); }
			popup = L.popup()
				.setLatLng(latlng)
				.setContent('<div class="cadInfo">Поиск информации...</div>')
				.openOn(map);
			L.gmxUtil.requestJSONP('http://pkk5.rosreestr.ru/api/features/',
				{
					WrapStyle: 'func',
					tolerance: 0,
					text: (latlng.lat + ' ' + latlng.lng).replace(/\./g, ',')
				},
				{
					callbackParamName: 'callback'
				}
			).then(function(data) {
// console.log(resp);
				var res = L.DomUtil.create('div', 'cadInfo');
				res.innerHTML = 'В данной точке объекты не найдены.<br><div class="red">Возможно участок свободен !</div>';
				for(var i = 0, len = data.features.length; i < len; i++) {
					var it = data.features[i],
                        // id = it.attrs.id,
						address = it.attrs.address;
					if (address) {
                        if (!popup._its) {
                            res = L.DomUtil.create('div', 'cadInfo');
                            popup._its = [];
                        }
                        popup._its.push(it);
                        (function() {
                            var curNum = popup._its.length - 1,
                                id = it.attrs.id,
                                div = L.DomUtil.create('div', 'cadItem', res);
                            L.DomUtil.create('div', 'cadNum', div).innerHTML = it.attrs.cn || '';
                            L.DomUtil.create('div', 'address', div).innerHTML = it.attrs.address || '';
                            var showPolygon = L.DomUtil.create('span', 'showPolygon', div);
                            var hidePolygon = L.DomUtil.create('span', 'showPolygon', div);
                            showPolygon.innerHTML = 'Показать участок';
                            hidePolygon.innerHTML = 'Скрыть участок';
                            L.DomEvent.on(hidePolygon, 'click', function() {
                                if (overlays[id]) { map.removeLayer(overlays[id]); }
                            }, this);
                            L.DomEvent.on(showPolygon, 'click', function() {
                                var it = popup._its[curNum];
                                var featureExtent = utils.getFeatureExtent(it, map);

                                var onViewreset = function() {
                                    map.off('moveend', onViewreset, this);
                                    featureExtent = utils.getFeatureExtent(it, map);
                                    overlays[id] = utils.setOverlay(featureExtent).addTo(map);
                                };
                                map.on('moveend', onViewreset, this);
                                map.fitBounds(featureExtent.latLngBounds, {reset: true});
                            }, this);
                        })();
					}
				}
				popup.setContent(res);
			});
		}, this);
      }
	  initialize();
	}
  }
});
