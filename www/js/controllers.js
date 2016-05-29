angular.module('starter.controllers', [])

.controller('AppCtrl', function($scope, $ionicModal, $timeout) {

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});

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

.controller('PlaylistsCtrl', function($scope, $http, $timeout, $cordovaBarcodeScanner) {
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
      $http.post('http://192.168.1.52:8000/session/', {'username': imei, 'password': $scope.password})
      .then(function(){
        alert("envio bien")
      }, function(){
        $scope.submited = false;
        $scope.spinner_show = false;
        alert("Error en el envio")
      });
    });
  }


  var socket = io('http://104.236.33.228:3000');
  socket.emit('i-am', 'CELL');
  $scope.leerQR = function() {
      alert("voy a leer el codigo");
      $cordovaBarcodeScanner.scan().then(function(imagenEscaneada) {
        console.log(imagenEscaneada);
        window.plugins.imeiplugin.getImei(function(imei){
          console.log({'web_id': imagenEscaneada.text, 'cell_id': imei}, socket);
          socket.emit('ionic-qr', {'web_id': imagenEscaneada.text, 'cell_id': imei});  
        });
      }, function(error){
          alert('Ha ocurrido un error ' + error);
      });
  }
})

.controller('PlaylistCtrl', function($scope, $stateParams) {
});
