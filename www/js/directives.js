angular.module('starter.directives', [])
    .directive("repeatEnd", function() {
        return {
            restrict: "A",
            link: function(scope, element, attrs) {
                console.log(scope);
                console.log(element);
                console.log(attrs);
                scope.$eval(attrs.repeatEnd);
                /*if (scope.$last) {
                    scope.$eval(attrs.repeatEnd);
                }*/
            }
        };
    })
    .directive("collapsible", function ($timeout) {
          return {
              link: function (scope, element, attrs) {
                  $timeout(function () {
                      element.collapsible();
                  });
                  if ("watch" in attrs) {
                      scope.$watch(function () {
                          return element[0].innerHTML;
                      }, function (oldVal, newVal) {
                          if (oldVal !== newVal) {
                              $timeout(function () {
                                  element.collapsible();
                              });
                          }
                      });
                  }
              }
          };
      })
      .directive("tabs", ["$timeout", function($timeout){
        return {
            link: function (scope, element, attrs) {
                element.addClass("tabs");
                $timeout(function() {
                    element.tabs();
                });
            }
        };
      }])
    .directive('map', function() {
        return {
            restrict: 'E',
            scope: {
                onCreate: '&'
            },
            link: function($scope, $element, $attr) {
                function initialize() {
                    var mapOptions = {
                        center: new google.maps.LatLng(10.4002248, -75.5428345),
                        zoom: 13,
                        mapTypeId: google.maps.MapTypeId.ROADMAP
                    };
                    var map = new google.maps.Map($element[0], mapOptions);

                    $scope.onCreate({
                        map: map
                    });

                    // Stop the side bar from dragging when mousedown/tapdown on the map
                    google.maps.event.addDomListener($element[0], 'mousedown', function(e) {
                        e.preventDefault();
                        return false;
                    });
                }

                if (document.readyState === "complete") {
                    initialize();
                } else {
                    google.maps.event.addDomListener(window, 'load', initialize);
                }
            }
        };
    });
