angular.module('rain.weather', [])

.controller('weatherControl', ['$scope', '$sce', '$window', 'Weather', 'Video', 'Comments', 'Users', function($scope, $sce, $window, Weather, Video, Comments, Users) {
  $scope.height = screen.height / 1.2;
  $scope.weather = 'Loading...';
  $scope.error = '';
  
  var shuffle = function(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
    return array;
  };

  var getPlaylist = function(weather) {
    Video.getVid(weather).then(function(data) {
      shuffle(data.items);
      $scope.playlist = data.items;
      var playlist = data.items.map(function(item) {
        return item.id.videoId;
      });
      var firstVid = playlist.shift();
      playlist = playlist.join(',');
      $scope.data = $sce.trustAsResourceUrl('https://www.youtube.com/embed/' + firstVid + '?playlist=' + playlist + '&autoplay=1&loop=1&iv_load_policy=3');
    });
  };

  $scope.getWeatherByInput = function() {
    Weather.getWeatherByCity($scope.city).then(function(data) {
      $scope.weather = 'Weather: ' + data.list[0].weather[0].main;
      $scope.location = 'Location: ' + data.city.name + ', ' + data.city.country;
      getPlaylist(data.list[0].weather[0].main);
    }); 
    $scope.city = '';   
  };

  $scope.getWeatherGeoLocation = function() {
    return new Promise(function(resolve, reject) {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    })
    .then(function(geo) {
      return [geo.coords.latitude, geo.coords.longitude];
    })
    .then(function(loc) {
      Weather.getWeatherByCoords(loc[0], loc[1]).then(function(data) {
        $scope.weather = 'Weather: ' + data.weather[0].main;
        $scope.location = 'Location: ' + data.name + ', ' + data.sys.country;
        getPlaylist(data.weather[0].main);
      });
    });
  };

  $scope.playlistClick = function(item, playlist) {
    var temp = playlist.map(function(item) {
      return item.id.videoId;
    });
    var reorder = temp.slice(temp.indexOf(item.id.videoId) + 1).concat(temp.slice(0, temp.indexOf(item.id.videoId)));
    $scope.data = $sce.trustAsResourceUrl('https://www.youtube.com/embed/' + item.id.videoId + '?playlist=' + reorder + '&autoplay=1&loop=1');
  };

  Comments.getComments().then(function(comments) {
    $scope.comments = comments.reverse();
  });

  $scope.postComment = function() {
    var data = {
      userName: $window.localStorage.userName || 'Anonymous',
      comment: $scope.commentInput
    };
    $scope.commentInput = '';
    Comments.postComments(data).then(function(data) {
      Comments.getComments().then(function(comments) {
        $scope.comments = comments.reverse();
      });
    });
  };

  $scope.getUser = function() {
    var user = {
      userName: $scope.username,
      password: $scope.password
    };

    Users.getUser({ userName: $scope.username }).then(function(data) {
      if (!data.length) {
        Users.createUser(user).then(function(data) {
          console.log(data);
        });
        $scope.error = 'Account created!';
      } else {
        $scope.error = 'Username already taken.';
      }
    });
  };

  $scope.mic = function () {
    if (!annyang.isListening()) {
      annyang.start();
    } else {
      annyang.abort();
    }
  };

  if (annyang) {
    var commands = {
      'Play songs in *location': function(location) {
        Weather.getWeatherByCity(location).then(function(data) {
          $scope.weather = 'Weather: ' + data.list[0].weather[0].main;
          $scope.location = 'Location: ' + data.city.name + ', ' + data.city.country;
          getPlaylist(data.list[0].weather[0].main);
        });
      }
    };
    annyang.addCommands(commands);
  }
  annyang.abort();
}]);
