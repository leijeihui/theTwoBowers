angular.module('rain.weather', [])

.controller('weatherControl', ['$scope', '$sce', '$window', 'Weather', 'Video', 'Comments', 'Users', function($scope, $sce, $window, Weather, Video, Comments, Users) {
  $scope.height = screen.height / 1.2;
  $scope.weather = 'Loading...';
  $scope.list = 'display: none';
  $scope.store = 'display: none';
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

  var update = function(data, prop, val) {
    return Users.updateUser({
      _id: data[0]._id,
      property: prop,
      value: val
    });
  };

  var generateSession = function() {
    var output = '';
    while (output.length < 10) { output += Math.floor(Math.random() * 10); }
    return output;
  };

  if ($window.localStorage.userName) {
    Users.getUser({ userName: $window.localStorage.userName }).then(function(data) {
      if (!data.length) {
        $window.localStorage.removeItem('userName');
      } else {
        if ($window.localStorage.compareSession !== data[0].session) {
          $window.localStorage.removeItem('userName'); 
          location.reload();
        } else {
          Weather.getWeatherByCity(data[0].lastLocation).then(function(data) {
            $scope.weather = 'Weather: ' + data.list[0].weather[0].main;
            $scope.loc = data.city.name + ', ' + data.city.country;
            $scope.location = 'Location: ' + $scope.loc;
            getPlaylist(data.list[0].weather[0].main);
          });

          $scope.save = 'display: unset';
          $scope.currentUser = 'Logged in as - ' + $window.localStorage.userName;
          $scope.logInButton = 'display: none';
        }
      }
    });
  } else {
    $scope.logOutButton = 'display: none';
    console.log('Not logged in');
  }

  $scope.display = function(prop) {
    if ($scope[prop].split(' ').includes('none')) {
      $scope[prop] = 'display: unset';
    } else {
      $scope[prop] = 'display: none';
    }    
  };

  $scope.getWeatherByInput = function() {
    Weather.getWeatherByCity($scope.city).then(function(data) {
      $scope.weather = 'Weather: ' + data.list[0].weather[0].main;
      $scope.loc = data.city.name + ', ' + data.city.country;
      $scope.location = 'Location: ' + $scope.loc;
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
        if ($scope.loc !== data.name + ', ' + data.sys.country) {
          $scope.weather = 'Weather: ' + data.weather[0].main;
          $scope.loc = data.name + ', ' + data.sys.country;
          $scope.location = 'Location: ' + $scope.loc;
          getPlaylist(data.weather[0].main);

          Users.getUser({
            userName: $window.localStorage.userName,
            session: $window.localStorage.compareSession
          }).then(function(data) {
            update(data, 'lastLocation', $scope.loc);
          });
        }
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
    var comment = {
      userName: $window.localStorage.userName || 'Anonymous',
      text: $scope.commentInput
    };

    var post = function() {
      Comments.postComments(comment).then(function(data) {
        Comments.getComments().then(function(comments) {
          $scope.comments = comments.reverse();
        });
      });
    };

    if ($window.localStorage.userName) {
      Users.getUser({ userName: $window.localStorage.userName }).then(function(data) {
        if ($window.localStorage.compareSession === data[0].session) {
          post();
        }
      });
    } else {
      post();
    }
    
    $scope.commentInput = '';
  };

  $scope.logOut = function() {
    $window.localStorage.removeItem('userName');
    $window.localStorage.removeItem('session');
    location.reload();
  };

  $scope.logIn = function() {
    var currentSession = generateSession();
    Users.getUser({ userName: $scope.username }).then(function(data) {
      if (!data.length) {
        var user = {
          userName: $scope.username,
          password: $scope.password,
          session: currentSession,
          lastLocation: $scope.loc
        };

        Users.createUser(user).then(function(data) {
          $scope.currentUser = 'Logged in as - ' + data.config.data.userName;
          $window.localStorage.userName = data.config.data.userName;
          $window.localStorage.compareSession = currentSession;
        });

        $scope.logInButton = 'display: none';
        $scope.logOutButton = '';
        $scope.error = '';
      } else {
        Users.getUser({ userName: $scope.username, password: $scope.password }).then(function(data) {
          if (!data.length) {
            $scope.error = 'Wrong password, try again.';
          } else {
            update(data, 'session', currentSession).then(function(update) {
              $scope.currentUser = 'Logged in as - ' + update.data.userName;
              $window.localStorage.userName = update.data.userName;
              $window.localStorage.compareSession = update.config.data.value;
            });
            $scope.save = 'display: unset';
            $scope.logInButton = 'display: none';
            $scope.logOutButton = '';
            $scope.error = '';
          }
        });
      }
    });
  };

  $scope.mic = function() {
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
          $scope.loc = data.city.name + ', ' + data.city.country;
          $scope.location = 'Location: ' + $scope.loc;
          getPlaylist(data.list[0].weather[0].main);
        });
      }
    };
    annyang.addCommands(commands);
  }
  annyang.abort();
}]);
