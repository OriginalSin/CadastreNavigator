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
		
		L.gmx.loadMap('CE81480280D8489586E12BDF7358E182', {leafletMap: map, setZIndex: true, hostName: 'maps.kosmosnimki.ru', apiKey: 'E5FB6CCB5D23B5E119D2F1B26BCC57BD'}).then(function(gmxMap) {
			var blm = map.gmxBaseLayersManager;
				mapProp = gmxMap.properties;
			blm.initDefaults().then(function() {
				var baseLayers = mapProp.BaseLayers,
					currentID = mapProp.currentID || baseLayers[0];

				blm.setActiveIDs(baseLayers);
				if (currentID) blm.setCurrentID(currentID);
			});

			L.control.gmxLayers(blm).addTo(map)
			map.gmxControlsManager.init();

			var layer = gmxMap.layersByID['C660AA6F702245949DE5A8044A6F6785'];
			map.gmxLayersControl.addOverlay(layer, 'Границы');
			layer.setZIndex(2000112);

			layer = gmxMap.layersByID['483F50F40A77480FB0C852F3FF014170'];
			map.gmxLayersControl.addOverlay(layer, 'КР');
			layer.setZIndex(20);
		});
		var popup = null;
		map.on('click', function(ev) {
// console.log(ev);
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
				var res = '';
				for(var i = 0, len = data.features.length; i < len; i++) {
					var it = data.features[i],
						address = it.attrs.address;
					if (address) {
						res = '<div class="cadNum">' + (it.attrs.cn || '') + '</div>';
						res += '<div class="address">' + (it.attrs.address || '') + '</div>';
						break;
					}
				}
				popup.setContent('<div class="cadInfo">' + (res ? res : 'В данной точке участки не найдены. <br><span class="red">Возможно участок свободен !</span>') + '</div>');
			});
			
			
		}, this);
      }
	  initialize();
	}
  }
});
