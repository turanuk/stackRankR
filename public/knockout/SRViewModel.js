/// <reference path="../js/knockout-2.0.0.js" />
/// <reference path="../js/linq.min.js" />

//Shortcut for unwrapping observables
var unwrap = ko.utils.unwrapObservable;

/////  MODELS
var Person = function (PersonId, RankingId, Name) {
  var self = this;
  self.PersonId = PersonId;
  self.Name = ko.observable(Name);
  self.EditPersonName = ko.observable(false);
}

var Ranking = function (RankingId, TeamId, Name, People) {
  var self = this;
  self.RankingId = RankingId;
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
  self.team = ko.observable(team);

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
    targetRanking.People.splice(newIndex, 0, person);
  }

  //Helper functions
  self.getRankingById = function (rankingId) {
    return Enumerable.From(unwrap(self.team().Rankings()))
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
    self.team().EditTeamName(true);
  }
  self.deleteRanking = function (ranking) {
    self.team().Rankings.remove(ranking);
  }

  //Pulling the view model from the server
  self.updateTeam = function () {
    //Mock team object to use for testing out mapping
    /*var team = {'TeamId':1, 'Name':'MyName', 
      'Rankings': [
        { 'RankingId': 1, 'Name': 'Worst', 'People': [ 
          {'PersonId': 1, 'Name': 'Foo'}, 
          {'PersonId': 2, 'Name': 'Bar'}
        ]}, 
        { 'RankingId': 2, 'Name': 'Below Average', 'People': [] }, 
      ]
    }*/
    $.getJSON('/getData', 
      function (data) {
        var outputTeam = self.createTeamFromObject(data);
        self.team(outputTeam);
      }
    );
  }

  self.saveTeam = function () {
    var outputTeam = self.createObjectFromTeam(self.team);
    $.post('/saveData', outputTeam, 
      function (data) {

      }
    );
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

  /////  HELPER FUNCTIONS
  self.createTeamFromObject = function (team) {
    var rankings = new Array();
    $.each(team.Rankings, function (i, state) {
      var rankingObject = state;
      var people = new Array();
      if (state.People) {
        $.each(state.People, function (i, state) {
          var person = new Person(state.PersonId, rankingObject.RankingId, state.Name);
          people.push(person);
        });
      }
      var ranking = new Ranking(state.RankingId, team.TeamId, state.Name, people);
      rankings.push(ranking);
    });

    return new Team(team.TeamId, team.Name, rankings);
  }

  //For pushing to the server
  self.createObjectFromTeam = function (team) {
    var outputTeam = { 'TeamId': 1, 'Name': team().Name() };
    var rankings = unwrap(team().Rankings());
    var rankingArray = new Array();
    $.each(rankings, function (i, state) {
      var people = unwrap(state.People);
      var peopleArray = new Array();
      $.each(people, function (i, state) {
        var personObj = { 'PersonId': state.PersonId, 'Name': state.Name() }
        peopleArray.push(personObj);
      });
      var ranking = { 'RankingId': state.RankingId, 'Name': state.Name(), 'People': peopleArray };
      rankingArray.push(ranking);
    });
    outputTeam.Rankings = rankingArray;
    return outputTeam;
  }
}

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