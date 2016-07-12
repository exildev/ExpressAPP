angular.module('starter.controllers', [])

.controller('AppCtrl', function($scope, $ionicModal, $timeout, $rootScope, $state) {

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});
  $scope.numero_pedidos = 0;
  $scope.messages = [];
  $scope.message = null;
  $scope.send_to = null;
  $scope.pedidos = [];
  $rootScope.logged = false;
  $scope.socket_pass = '123456';
  $scope.socket_user = 'user1';
  $scope.nombre = "Express del norte";
  $scope.foto = "images/avatar.jpg";
  
  $scope.socket = io('http://104.236.33.228:4000');


  document.addEventListener("deviceready", function(){
    var imei = device.uuid;
    $scope.socket.emit('identify', {
      'django_id': imei,
      'usertype': 'CELL',
    });
    $scope.socket.emit('get-data', {
      'cell_id': imei
    });
  }, false);

  $scope.socket.on('identify', function(message) {
    console.log(message);
    if(!message['ID']){
      if($rootScope.logged){
        $state.go('app.entregas');
        $scope.socket_login();
      }else{
        $state.go('app.playlists');
      }
    }else{
      $scope.send_messages();
    }
  });

  $scope.socket.on('success-login', function() {
    $scope.send_messages();
  });

  $scope.socket.on('error-login', function() {
    alert("Error al intentar iniciar sesión");
  });

  $scope.socket.on('no-session', function(){
    $rootScope.logged = false;
    $state.go('app.playlists');
  });

  $scope.socket.on('numero-pedido', function(message){
    $scope.numero_pedidos = message.numero_pedidos;
    $scope.$apply();
  });

  $scope.socket.on('get-data', function(message){
    if (message.nombre) {
      $scope.nombre = message.nombre + ' ' + message.apellidos
    };

    if (message.foto) {
      $scope.foto = message.foto;
    };
    $scope.$apply();
  });

  /*$rootScope.$on('$cordovaLocalNotification:click',
    function (event, notification, state) {
      console.log(event, notification, state);
    }
  );*/

  $scope.send_messages = function() {
    var imei = device.uuid;
    $scope.socket.emit('numero-pedido', {
      'django_id': imei,
      'usertype': 'CELL',
      'cell_id': imei
    });

    for (var i = $scope.messages.length - 1; i >= 0; i--) {
      var message = $scope.messages[i];
      message.message['django_id'] = imei;
      message.message['usertype'] = 'CELL';
      console.log("voy a mandar", message);
      $scope.socket.emit(message.send_to, message.message);
    }
    $scope.messages = [];
  }

  $scope.emit_message = function(send_to, message){
    console.log("msg enqued");
    $scope.messages.push({'send_to': send_to, 'message': message});
    var imei = device.uuid;
    $scope.socket.emit('identify', {
      'django_id': imei,
      'usertype': 'CELL'
    });
  }
  
  $scope.socket_login = function(){
    var imei = device.uuid;
    $scope.socket.emit('login', {
      'django_id': imei,
      'usertype': 'CELL',
      'web_password': $scope.password,
      'password': $scope.socket_pass,
      'username': $scope.socket_user
    });
  }
})

.controller('PlaylistsCtrl', function($scope, $http, $timeout, $cordovaBarcodeScanner, $state, $ionicSideMenuDelegate, $rootScope, $ionicHistory) {
  
  $ionicHistory.nextViewOptions({
       disableBack: true
  });

  $ionicSideMenuDelegate.canDragContent(false);

  $scope.h = window.innerHeight;
  $scope.keyStyle = {};

  window.addEventListener('native.keyboardshow', function(){
    $scope.keyStyle = {height: $scope.h + 'px'};
    $scope.focus = true;
    $scope.$apply();
  });

  window.addEventListener('native.keyboardhide', function(){
    $scope.keyStyle = {};
    $scope.focus = false;
    $scope.$apply();
  });

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
    var imei = device.uuid;
    console.log("enviare el login");
    $scope.socket.emit('web-login', {
      'django_id': imei,
      'usertype': 'CELL',
      'web_password': $scope.password,
      'password': $scope.socket_pass,
      'username': $scope.socket_user
    });
    $scope.socket.on('web-success-login', function() {
      $rootScope.logged = true;
      $state.go('app.entregas');
      $scope.send_messages();
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
        var imei = device.uuid;
        console.log(imei);
        $scope.socket.emit('ionic-qr', {'web_id': imagenEscaneada.text, 'cell_id': imei});
      }, function(error){
          alert('Ha ocurrido un error ' + error);
      });
  }
})

.controller('PlaylistCtrl', function($scope, $stateParams) {
})

.controller('EntregaCtrl', function($scope, $cordovaLocalNotification, $cordovaGeolocation, $interval, Camera) {
  $scope.accepted = {};
  $scope.picked = {};
  $scope.intervalGPS = undefined;

  $scope.test_sesion = function(){
    console.log("test sesion")
    var imei = device.uuid;
    $scope.socket.emit('identify', {
      'django_id': imei,
      'usertype': 'CELL'
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
      $scope.intervalGPS = $interval(function() {
        var posOptions = {timeout: 10000, enableHighAccuracy: true};
          $cordovaGeolocation.getCurrentPosition(posOptions).then(function (position) {
            var lat  = position.coords.latitude;
            var lng = position.coords.longitude;
            console.log(lat, lng);
            $scope.emit_message('send-gps', {'lat': lat, 'lng': lng});
          }, function(err) {
            $scope.emit_message('send-gps', {'error': err});
          });
      }, 30000);
    };
  }

  $scope.stop_gps = function() {
    if (angular.isDefined($scope.intervalGPS)) {
      $interval.cancel($scope.intervalGPS);
      $scope.intervalGPS = undefined;
    }
  }

  $scope.accept_pedido = function(id){
    var intervalGPS;
    var f_p = function(p){
      return p.id == id
    }
    var values = $scope.pedidos.filter(f_p);
    if(values){
      var imei = device.uuid;
      $scope.emit_message('accept-pedido', {'pedido_id': id, 'cell_id': imei});
      $scope.accepted[id] = true;
      $scope.start_gps();
      $cordovaLocalNotification.cancel(id).then(function (result) {
        console.log("notificacion borrada");
      });
    }
  }

  $scope.recojer = function (id, tipo) {
    delete $scope.accepted[id];
    $scope.picked[id] = true;
    var imei = device.uuid;
    $scope.emit_message('recojer-pedido', {'pedido_id': id, 'cell_id': imei, 'tipo': tipo});
  }

  $scope.confirmar = function(pedido_id, tipo){
    var options = {
         quality : 75,
         targetWidth: 800,
         targetHeight: 800,
         sourceType: 1
    };
    Camera.getPicture(options).then(function(imageData) {
       console.log(imageData);
       $scope.uploadImage(imageData, pedido_id, tipo);
    }, function(err) {
       console.log(err);
    });
  }

  $scope.cancelar = function(pedido_id, tipo){
    var options = {
         quality : 75,
         targetWidth: 800,
         targetHeight: 800,
         sourceType: 1
    };
    Camera.getPicture(options).then(function(imageData) {
       console.log(imageData);
       $scope.uploadCancelImage(imageData, pedido_id, tipo);
    }, function(err) {
       console.log(err);
    });
  }

  $scope.uploadImage = function(fileURL, pedido_id, tipo){
    var win = function (r) {
      console.log("Code = " + r.responseCode);
      console.log("Response = " + r.response);
      console.log("Sent = " + r.bytesSent);
      var f_p = function(p){
        return p.id == pedido_id && p.tipo == tipo;
      }
      var values = $scope.pedidos.filter(f_p);
      if(values){
        var index = $scope.pedidos.indexOf(values[0]);
        $scope.emit_message('delete-message',{message_id: $scope.pedidos[index].message_id});
        $scope.pedidos.splice(index, 1);
        $scope.$apply();
        if ($scope.pedidos.length <=0) {
          $scope.stop_gps();
        };
      }
    }

    var fail = function (error) {
      alert("An error has occurred: Code = " + error.code);
      console.log("upload error source " + error.source);
      console.log("upload error target " + error.target);
    }

    var options = new FileUploadOptions();
    options.fileKey = "confirmacion";
    options.fileName = fileURL.substr(fileURL.lastIndexOf('/') + 1);

    var params = {};
    var imei = device.uuid;
    params.django_id = imei;
    params.usertype = 'CELL';
    params.pedido = pedido_id;
    params.tipo = tipo;
    options.params = params;

    var ft = new FileTransfer();
    ft.upload(fileURL, encodeURI("http://104.236.33.228:4000/upload"), win, fail, options);
  }

  $scope.uploadCancelImage = function(fileURL, pedido_id, tipo){
    var win = function (r) {
      console.log("Code = " + r.responseCode);
      console.log("Response = " + r.response);
      console.log("Sent = " + r.bytesSent);
      var f_p = function(p){
        return p.id == pedido_id && p.tipo == tipo;
      }
      var values = $scope.pedidos.filter(f_p);
      if(values){
        var index = $scope.pedidos.indexOf(values[0]);
        $scope.emit_message('delete-message',{message_id: $scope.pedidos[index].message_id});
        $scope.pedidos.splice(index, 1);
        $scope.$apply();
        if ($scope.pedidos.length <=0) {
          $scope.stop_gps();
        };
      }
    }

    var fail = function (error) {
      alert("An error has occurred: Code = " + error.code);
      console.log("upload error source " + error.source);
      console.log("upload error target " + error.target);
    }

    var options = new FileUploadOptions();
    options.fileKey = "confirmacion";
    options.fileName = fileURL.substr(fileURL.lastIndexOf('/') + 1);

    var params = {};
    var imei = device.uuid;
    params.django_id = imei;
    params.usertype = 'CELL';
    params.pedido = pedido_id;
    params.tipo = tipo;
    options.params = params;

    var ft = new FileTransfer();
    ft.upload(fileURL, encodeURI("http://104.236.33.228:4000/cancel"), win, fail, options);
  }

  $scope.socket.on('modificar-pedido', function(message) {

    message.info.cliente = message.cliente[0];
    message.empresa = message.tienda[0];
    message.info.total_pedido = message.total;

    var f_p = function(p){
      return p.id == message.id && p.tipo == message.tipo;
    }
    var values = $scope.pedidos.filter(f_p);
    if(values){
      var index = $scope.pedidos.indexOf(values[0]);
      if (index < 0) {
        $scope.pedidos.push(message);
        $scope.accepted[message.id] = true;
      }else{
        $scope.pedidos[index] = message;
      }
    }else{
      $scope.pedidos.push(message);
      $scope.accepted[message.id] = true;
    }
    $scope.start_gps();
    $scope.emit_message('visit-message',{message_id: message.message_id});
    $scope.$apply();
  });

  $scope.socket.on('notify-pedido', function(pedido) {
    console.log(pedido)
    pedido.empresa = pedido.tienda[0];
    $scope.pedidos.push(pedido);
    $scope.$apply();
    $scope.emit_message('visit-message',{message_id: pedido.message_id});
    $cordovaLocalNotification.schedule({
      id: pedido.id,
      title: "Pedido para la " + pedido.info.cliente.direccion,
      text: 'para reocojer en la tienda ' + pedido.tienda[0].referencia,
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
    $scope.emit_message('visit-message',{message_id: pedido.message_id});
  });

  $scope.socket.on('request-gps', function(data){
    console.log("request-gps");
    var posOptions = {timeout: 10000, enableHighAccuracy: true};
    $cordovaGeolocation.getCurrentPosition(posOptions).then(function (position) {
        var lat  = position.coords.latitude;
        var lng = position.coords.longitude;
        $scope.emit_message('reponse-gps', {'lat': lat, 'lng': lng , pedido: data});
    }, function(error){
      console.log(errors)
    });
    $scope.emit_message('visit-message',{message_id: data.message_id, 'emit': 'reponse-gps'});
  });

  $scope.socket.on('asignar-pedido', function(message) {
    console.log(message);
    if (message.tipo == 1) {
      message.info.cliente = message.cliente[0];
      message.empresa = message.tienda[0];
      message.info.total_pedido = message.total
    }else{
      message.empresa = message.tienda[0];
    }
    $scope.pedidos.push(message);
    $scope.accepted[message.id] = true;
    $scope.$apply();
    $scope.start_gps();
    $scope.emit_message('visit-message',{message_id: message.message_id, 'emit': message.emit});
    var imei = device.uuid;
    if (message.tipo == 1) {
      $scope.emit_message('pedido-recibido', {'pedido_id': message.id, 'cell_id': imei});
    }else{
      $scope.emit_message('accept-pedido', {'pedido_id': message.id, 'cell_id': imei});
    }
  });

  $scope.socket.on('trasladar-pedido', function(message) {
    var f_p = function(p){
      return p.id == message.id && p.tipo == message.tipo;
    }
    var values = $scope.pedidos.filter(f_p);
    if(values){
      var index = $scope.pedidos.indexOf(values[0]);
      $scope.emit_message('delete-message',{message_id: $scope.pedidos[index].message_id});
      $scope.pedidos.splice(index, 1);
      $scope.$apply();
      if ($scope.pedidos.length <=0) {
        $scope.stop_gps();
      };
    }
  });
});
