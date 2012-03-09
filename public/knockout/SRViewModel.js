/// <reference path="../js/knockout-2.0.0.js" />
/// <reference path="../js/linq.min.js" />

//Shortcut for unwrapping observables
var unwrap = ko.utils.unwrapObservable;

/////  MODELS
var Person = function (PersonId, RankingId, Name) {
  var self = this;
  self.PersonId = PersonId;
  self.RankingId = ko.observable(RankingId);
  self.Name = ko.observable(Name);
  self.EditPersonName = ko.observable(false);
}

var Ranking = function (RankingId, TeamId, Name, People) {
  var self = this;
  self.RankingId = RankingId;
  self.TeamId = TeamId;
  self.Name = ko.observable(Name);
  self.People = ko.observableArray(People);
  self.EditRankingName = ko.observable(false);
}

var Team = function (TeamId, Name, Rankings) {
  var self = this;
  self.TeamId = TeamId;
  self.Name = ko.observable(Name);
  self.Rankings = ko.observableArray(Rankings);
  self.EditTeamName = ko.observable(false);
}

/////  VIEWMODEL
var SRViewModel = function (team) {
  var self = this;
  self.rankings = team.Rankings;
  self.team = team;

  //Functions called from custom binding that keep view and client side object model in sync
  self.reorderPerson = function (newIndex, personId, rankingId) {
    var ranking = self.getRankingById(rankingId);
    var person = self.getPersonFromRanking(personId, ranking);
    ranking.People.remove(person);
    ranking.People.splice(newIndex, 0, person);
  }
  self.movePerson = function (newIndex, personId, sourceRankingId, targetRankingId) {
    var sourceRanking = self.getRankingById(sourceRankingId);
    var targetRanking = self.getRankingById(targetRankingId);
    var person = self.getPersonFromRanking(personId, sourceRanking);
    sourceRanking.People.remove(person);
    person.RankingId(targetRankingId);
    targetRanking.People.splice(newIndex, 0, person);
  }

  //Helper functions
  self.getRankingById = function (rankingId) {
    return Enumerable.From(unwrap(self.rankings))
      .Where(function (x) { return x.RankingId == rankingId }).First();
  }
  self.getPersonFromRanking = function (personId, ranking) {
    return Enumerable.From(unwrap(ranking.People))
      .Where(function (x) { return x.PersonId == personId }).First();
  }

  //Front-end data-binding functions
  self.editPersonName = function (person) {
    person.EditPersonName(true);
  }
  self.editRankingName = function (ranking) {
    ranking.EditRankingName(true);
  }
  self.editTeamName = function () {
    self.team.EditTeamName(true);
  }
  self.deleteRanking = function (ranking) {
    self.rankings.remove(ranking);
  }

  //Front-end list manipulation functions
  self.newPersonToRanking = function (ranking) {
    //BUG : Need to get this new ID from data layer to avoid client-side duplicates
    var personToAdd = new Person(-1, ranking.RankingId, 'NewPerson');
    ranking.People.push(personToAdd);
  }
  self.removePersonFromRanking = function (person) {
    var ranking = self.getRankingById(person.RankingId());
    ranking.People.remove(person);
  }
}

/////  HELPER FUNCTIONS

/////  CLIENT INIT
$().ready(function () {
  //TODO: Populate from server model on refresh
  var people = new Array(
    new Person(1, 1, 'Jim'), 
    new Person(2, 1, 'Mark')
  );

  var rankings = new Array(
    new Ranking(
      1,
      1,
      'Worst',
      people
    ),
    new Ranking(
      2,
      1,
      'Below Average',
      new Array()
    ),
    new Ranking(
      3,
      1,
      'Average',
      new Array()
    ),
    new Ranking(
      4,
      1,
      "Above Average",
      new Array()
    ),
    new Ranking(
      5,
      1,
      "Best",
      new Array()
    )
  );

  var team = new Team(1, 'Default', rankings);

  ko.applyBindings(new SRViewModel(team));
});