angular.module('starter.controllers', [])

.controller('AppCtrl', function($scope, $ionicModal, $timeout, $rootScope, $state) {

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});

  
  $scope.message = null;
  $scope.send_to = null;
  $scope.pedidos = [];
  $rootScope.logged = false;
  $scope.socket_pass = '123456';
  $scope.socket_user = 'user1';
  
  $scope.socket = io('http://192.168.0.103:4000');
  $scope.socket.emit('i-am', 'CELL');

  document.addEventListener('deviceready', function() {
    window.plugins.imeiplugin.getImei(function(imei){
      $scope.socket.emit('identify', {
        'django_id': imei,
        'usertype': 'CELL'
      });
    });
  });

  $scope.socket.on('identify', function(message) {
    console.log(message);
    if(!message['ID']){
      if($rootScope.logged){
        $scope.socket_login();
      }else{
        $state.go('app.playlists');
      }
    }else{
      if($scope.send_to && $scope.message){
        window.plugins.imeiplugin.getImei(function(imei){
          $scope.message['django_id'] = imei;
          $scope.message['usertype'] = 'CELL';
          $scope.socket.emit($scope.send_to, $scope.message);
          $scope.message = null;
          $scope.send_to = null;
        });
      }
    }
  });

  $scope.socket.on('no-session', function(){
    $rootScope.logged = false;
    $state.go('app.playlists');
  });

  /*$rootScope.$on('$cordovaLocalNotification:click',
    function (event, notification, state) {
      console.log(event, notification, state);
    }
  );*/

  $scope.emit_message = function(send_to, message){
    console.log("msg enqued");
    $scope.send_to = send_to;
    $scope.message = message;
    window.plugins.imeiplugin.getImei(function(imei){
      $scope.socket.emit('identify', {
        'django_id': imei,
        'usertype': 'CELL'
      });
    });
  }
  
  $scope.socket_login = function(){
    window.plugins.imeiplugin.getImei(function(imei){
      $scope.socket.emit('login', {
        'django_id': imei,
        'usertype': 'CELL',
        'web_password': $scope.password,
        'password': $scope.socket_pass,
        'username': $scope.socket_user
      });
    });
    $scope.socket.on('success-login', function() {
      window.plugins.imeiplugin.getImei(function(imei){
        $scope.message['django_id'] = imei;
        $scope.message['usertype'] = 'CELL';
        $scope.socket.emit($scope.send_to, $scope.message);
        $scope.message = null;
        $scope.send_to = null;
      });
    });
    $scope.socket.on('error-login', function() {
      alert("Error al intentar iniciar sesión");
    });
  }
})

.controller('PlaylistsCtrl', function($scope, $http, $timeout, $cordovaBarcodeScanner, $state, $ionicSideMenuDelegate, $rootScope) {
  $ionicSideMenuDelegate.canDragContent(false);

  $scope.password = "";
  $scope.pressKey = function(number) {
    $scope.password += number;
  }
  $scope.erase = function(){
    $scope.password = $scope.password.slice(0, -1);
  }
  $scope.eraseAll = function(){
    $scope.password = "";
  }

  $scope.login = function(){
    $scope.submited = true;
    $timeout(function() {
        $scope.spinner_show = true;
    }, 500);

    window.plugins.imeiplugin.getImei(function(imei){
      console.log("enviare el login");
      $scope.socket.emit('web-login', {
        'django_id': imei,
        'usertype': 'CELL',
        'web_password': $scope.password,
        'password': $scope.socket_pass,
        'username': $scope.socket_user
      });
    });
    $scope.socket.on('web-success-login', function() {
      $rootScope.logged = true;
      $state.go('app.entregas');
    });
    $scope.socket.on('web-error-login', function() {
      $scope.submited = false;
      $timeout(function() {
          $scope.spinner_show = false;
        }, 500);
        alert("Error al intentar iniciar sesión");
    });
  }

  $scope.leerQR = function() {
      $cordovaBarcodeScanner.scan().then(function(imagenEscaneada) {
        console.log(imagenEscaneada);
        window.plugins.imeiplugin.getImei(function(imei){
          console.log(imei);
          $scope.socket.emit('ionic-qr', {'web_id': imagenEscaneada.text, 'cell_id': imei});
        });
      }, function(error){
          alert('Ha ocurrido un error ' + error);
      });
  }
})

.controller('PlaylistCtrl', function($scope, $stateParams) {
})

.controller('EntregaCtrl', function($scope, $cordovaLocalNotification, $cordovaGeolocation, $interval) {
  console.log($scope.logged);
  $scope.accepted = {};
  $scope.intervalGPS = undefined;

  $scope.test_sesion = function(){
    console.log("test sesion")
    window.plugins.imeiplugin.getImei(function(imei){
      $scope.socket.emit('identify', {
        'django_id': imei,
        'usertype': 'CELL'
      });
    });
  }

  $scope.reject_pedido = function(id){

    var f_p = function(p){
      return p.id == id
    }
    var values = $scope.pedidos.filter(f_p);
    var index = -1;
    if(values){
      index = $scope.pedidos.indexOf(values[0]); 
    }
    console.log("eliminare el pedido", index, values);
    if (index > -1) {
      delete $scope.pedidos[index];
      $scope.pedidos.splice(index, 1);
      $cordovaLocalNotification.cancel(id).then(function (result) {
        console.log("notificacion borrada");
      });
    }
  }

  $scope.start_gps = function(){
    console.log("start gps");
    if (!angular.isDefined($scope.intervalGPS)) {
      intervalGPS = $interval(function() {
        var posOptions = {timeout: 10000, enableHighAccuracy: true};
          $cordovaGeolocation.getCurrentPosition(posOptions).then(function (position) {
            var lat  = position.coords.latitude;
            var lng = position.coords.longitude;
            console.log(lat, lng);
            $scope.emit_message('send-gps', {'lat': lat, 'lng': lng});
          }, function(err) {
            $scope.emit_message('send-gps', {'error': err});
          });
      }, 10000);
    };
  }

  $scope.accept_pedido = function(id){
    var intervalGPS;
    var f_p = function(p){
      return p.id == id
    }
    var values = $scope.pedidos.filter(f_p);
    if(values){
      window.plugins.imeiplugin.getImei(function(imei){
        $scope.emit_message('accept-pedido', {'pedido_id': id, 'cell_id': imei});
        $scope.accepted[id] = true;
        $scope.start_gps();
      });
      $cordovaLocalNotification.cancel(id).then(function (result) {
        console.log("notificacion borrada");
      });
    }
  }

  $scope.socket.on('notify-pedido', function(pedido) {
    console.log(pedido)
    $scope.pedidos.push(pedido);
    $scope.$apply();
    $cordovaLocalNotification.schedule({
      id: pedido.id,
      title: "Pedido para la " + pedido.pedido.cliente.dirreccion,
      text: 'para reocojer en la tienda ' + pedido.pedido.tienda,
    });
  });
  
  $scope.socket.on('delete-pedido', function(pedido) {
    var f_p = function(p){
      return p.id == pedido.id
    }

    var values = $scope.pedidos.filter(f_p);
    var index = -1;
    if(values){
      index = $scope.pedidos.indexOf(values[0]); 
    }
    console.log("eliminare el pedido", index, pedido);
    if (index > -1) {
      delete $scope.pedidos[index];
      $scope.pedidos.splice(index, 1);
      $scope.$apply();
      $cordovaLocalNotification.cancel(pedido.id).then(function (result) {
        console.log("notificacion borrada");
      });
    }
  });

  $scope.socket.on('request-gps', function(data){
    var posOptions = {timeout: 10000, enableHighAccuracy: true};
    $cordovaGeolocation.getCurrentPosition(posOptions).then(function (position) {
      var lat  = position.coords.latitude;
        var lng = position.coords.longitude;
        console.log(lat, lng);
        $scope.socket.emit('reponse-gps', {'lat': lat, 'lng': lng});
    }, function(error){
      console.log(errors)
    });
  });

  $scope.socket.on('asignar-pedido', function(message) {
    console.log(message);
    $scope.pedidos.push(message);
    $scope.accepted[message.id] = true;
    $scope.$apply();
    $scope.start_gps();
  });
});
