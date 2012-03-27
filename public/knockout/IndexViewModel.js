/// <reference path="../js/knockout-2.0.0.js" />
/// <reference path="../js/linq.min.js" />

//Shortcut for unwrapping observables
var unwrap = ko.utils.unwrapObservable;

/////  VIEWMODEL
var IndexViewModel = function (teams) {
  var self = this;
  self.teams = ko.observableArray(teams);
  self.status = ko.observable();
  self.error = ko.observable();

  self.addTeam = function (model) {
    $.ajax({
      url: '/newTeam',
      type: 'POST'
    }).done(function (data) {
      $.getJSON('/getUserTeams', function (data) {
        if (data) {
          $('.main').hide();
          self.teams(data);
          $('.main').fadeIn();
        } else {
          window.location.href = '/';
        }
      }); 
    });
  }

  self.deleteTeam = function (team) {
    $.ajax({
      url: '/deleteTeam/' + team.TeamId,
      type: 'POST'
    }).done(function (data) {
      self.teams.remove(team);
    });
  }
}

/////  CLIENT INIT
$().ready(function () {
  $.getJSON('/getUserTeams', function (data) {
    if (data) {
      ko.applyBindings(new IndexViewModel(data));
      $('.main').fadeIn();
    } else {
      window.location.href = '/';
    }
  }); 
});