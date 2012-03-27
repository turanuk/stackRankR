/// <reference path="../js/knockout-2.0.0.js" />
/// <reference path="../js/linq.min.js" />

//Shortcut for unwrapping observables
var unwrap = ko.utils.unwrapObservable;

/////  MODELS
var Team = function (TeamId, Name) {
  var self = this;
  self.TeamId = ko.observable(TeamId);
  self.Name = ko.observable(Name);
}

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
      
    });
  }
}

/////  CLIENT INIT
$().ready(function () {
  $.getJSON('/getUserTeams', function (data) {
    if (data) {
      ko.applyBindings(new IndexViewModel(data));
      $(".main").fadeIn();
    } else {
      window.location.href = '/';
    }
  }); 
});