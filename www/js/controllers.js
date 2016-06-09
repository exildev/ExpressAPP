angular.module('starter.controllers', [])

.controller('AppCtrl', function($scope, $ionicModal, $timeout, $rootScope) {

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});
  
  $scope.pedidos = [];
  
  var actions = [ {
        identifier: 'SIGN_IN',
        title: 'Yes',
        icon: 'res://ic_signin',
        activationMode: 'background',
        destructive: false,
        authenticationRequired: true
    },
    {
       identifier: 'MORE_SIGNIN_OPTIONS',
       title: 'More Options',
       icon: 'res://ic_moreoptions',
       activationMode: 'foreground',
       destructive: false,
       authenticationRequired: false
    },
    {
       identifier: 'PROVIDE_INPUT',
       title: 'Provide Input',
       icon: 'ic_input',
       activationMode: 'background',
       destructive: false,
       authenticationRequired: false,
       behavior: 'textInput',
       textInputSendTitle: 'Reply'
  }];
  
  $scope.socket = io('http://192.168.0.102:3000');
  $scope.socket.emit('i-am', 'CELL');

  $scope.socket.on('list-pedidos', function(pedidos) {
    $scope.pedidos = pedidos;
  });

  /*$rootScope.$on('$cordovaLocalNotification:click',
    function (event, notification, state) {
      console.log(event, notification, state);
    }
  );*/
  // Form data for the login modal
  $scope.loginData = {};

  // Create the login modal that we will use later
  $ionicModal.fromTemplateUrl('templates/login.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.modal = modal;
  });

  // Triggered in the login modal to close it
  $scope.closeLogin = function() {
    $scope.modal.hide();
  };

  // Open the login modal
  $scope.login = function() {
    $scope.modal.show();
  };

  // Perform the login action when the user submits the login form
  $scope.doLogin = function() {
    console.log('Doing login', $scope.loginData);

    // Simulate a login delay. Remove this and replace with your login
    // code if using a login system
    $timeout(function() {
      $scope.closeLogin();
    }, 1000);
  };
})

.controller('PlaylistsCtrl', function($scope, $http, $timeout, $cordovaBarcodeScanner, $state, $ionicSideMenuDelegate) {
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
      $http.post('http://192.168.0.102:8000/session/', {'username': imei, 'password': $scope.password})
      .then(function(){
        window.plugins.imeiplugin.getImei(function(imei){
          $scope.socket.emit('cell-active',{'cell_id': imei});
        });
        $state.go('app.entregas');
      }, function(){
        $scope.submited = false;
        $timeout(function() {
          $scope.spinner_show = false;
        }, 500);
        alert("Error en el envio");
      });
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

  $scope.accepted = {};

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

  $scope.accept_pedido = function(id){
    var intervalGPS;
    var f_p = function(p){
      return p.id == id
    }
    var values = $scope.pedidos.filter(f_p);
    if(values){
      window.plugins.imeiplugin.getImei(function(imei){
        $scope.socket.emit('accept-pedido', {'pedido_id': id, 'cell_id': imei});
        $scope.accepted[id] = true;
        if (!angular.isDefined(intervalGPS)) {
          console.log("entre");
          intervalGPS = $interval(function() {
            console.log("Estoy en el interval");
            var posOptions = {timeout: 10000, enableHighAccuracy: true};
              $cordovaGeolocation.getCurrentPosition(posOptions).then(function (position) {
                var lat  = position.coords.latitude;
                var long = position.coords.longitude;
                console.log(lat, long);
                $scope.socket.emit('send-gps', {'lat': lat, 'long': long});
              }, function(err) {
                $scope.socket.emit('send-gps', {'error': err});
              });
          }, 10000);
        };
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
      title: 'Motorizado Tales Pascuales',
      text: 'Tiene una entrega por recojer en tal lado',
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
});
