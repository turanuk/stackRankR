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
    self.teams.push(new Team(self.teams().length, 'New Team'));
    self.updateTeamIds();
  }

  self.updateTeamIds = function () {
    for (var i = 0; i < self.teams().length; i++) {
      self.teams()[i].TeamId(i);
    }
  }
}

/////  CLIENT INIT
$().ready(function () {
  //TODO: Populate from server model on refresh
  var team = new Team(0, 'My First Team');
  var teams = new Array();
  teams.push(team);

  ko.applyBindings(new IndexViewModel(teams));
});