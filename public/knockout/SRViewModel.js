/// <reference path="../js/knockout-2.0.0.js" />
/// <reference path="../js/linq.min.js" />

//Shortcut for unwrapping observables
var unwrap = ko.utils.unwrapObservable;

/////  MODELS
var Person = function (PersonId, Name) {
  var self = this;
  self.PersonId = ko.observable(PersonId);
  self.Name = ko.observable(Name);
  self.EditPersonName = ko.observable(false);
}

var Ranking = function (RankingId, Name, People) {
  var self = this;
  self.RankingId = ko.observable(RankingId);
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
  self.status = ko.observable();
  self.error = ko.observable();

  //Functions called from custom binding that keep view and client side object model in sync
  self.reorderPerson = function (newIndex, personId, rankingId) {
    var ranking = self.getRankingById(rankingId);
    var person = self.getPersonFromRanking(personId, ranking);
    ranking.People.remove(person);
    ranking.People.splice(newIndex, 0, person);
    self.updatePersonIds(ranking);
  }
  self.movePerson = function (newIndex, personId, sourceRankingId, targetRankingId) {
    var sourceRanking = self.getRankingById(sourceRankingId);
    var targetRanking = self.getRankingById(targetRankingId);
    var person = self.getPersonFromRanking(personId, sourceRanking);
    sourceRanking.People.remove(person);
    targetRanking.People.splice(newIndex, 0, person);
    self.updatePersonIds(sourceRanking);
    self.updatePersonIds(targetRanking);
  }
  
  //Helper functions
  self.getRankingById = function (rankingId) {
    return Enumerable.From(unwrap(self.team().Rankings()))
      .Where(function (x) { return x.RankingId() == rankingId }).First();
  }
  self.getPersonFromRanking = function (personId, ranking) {
    return Enumerable.From(unwrap(ranking.People))
      .Where(function (x) { return x.PersonId() == personId }).First();
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
    if (ranking.People().length === 0) {
      self.team().Rankings.remove(ranking);
      self.updateRankingIds();
    } else {
      self.status('You cannot delete a ranking with people in it!');
    }
  }

  //Pulling the view model from the server
  self.refreshTeam = function () {
    $.getJSON('/getData', 
      function (data) {
        var outputTeam = self.createTeamFromObject(data);
        self.team(outputTeam);
        self.status('Refreshed');
      }
    );
  }

  self.saveTeam = function () {
    var outputTeam = self.createObjectFromTeam(self.team);
    $.post('/saveData', outputTeam, 
      function (data) {
        self.status('Saved');
      }
    );
  }

  //Front-end list manipulation functions
  self.newPersonToRanking = function (ranking) {
    var newId = 'r' + ranking.RankingId() + 'p' + ranking.People().length;
    var personToAdd = new Person(newId, 'NewPerson');
    ranking.People.push(personToAdd);
  }
  self.removePersonFromRanking = function (person, element) {
    var rankingId = $($(element.currentTarget).parents('ul')).attr('data-RankingId');
    var ranking = self.getRankingById(rankingId);
    ranking.People.remove(person);
    self.updatePersonIds(ranking);
  }
  self.addRanking = function (model) {
    self.team().Rankings.push(new Ranking(self.team().Rankings().length, 'NewRanking', []));
    self.updateRankingIds();
  }

  /////  HELPER FUNCTIONS
  self.updatePersonIds = function (ranking) {
    for (var i = 0; i < ranking.People().length; i++) {
      ranking.People()[i].PersonId('r' + ranking.RankingId() + 'p' + i);
    }
  }

  self.updateRankingIds = function () {
    for (var i = 0; i < self.team().Rankings().length; i++) {
      self.team().Rankings()[i].RankingId(i);
    }
  }

  self.createTeamFromObject = function (team) {
    var rankings = new Array();
    $.each(team.Rankings, function (i, state) {
      var rankingObject = state;
      var people = new Array();
      if (state.People) {
        $.each(state.People, function (i, state) {
          var person = new Person(state.PersonId, state.Name);
          people.push(person);
        });
      }
      var ranking = new Ranking(state.RankingId, state.Name, people);
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
      var ranking = { 'RankingId': state.RankingId(), 'Name': state.Name(), 'People': peopleArray };
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
    new Person('r0p0','Jim'), 
    new Person('r0p1','Mark')
  );

  var rankings = new Array(
    new Ranking(
      0,
      'Worst',
      people
    ),
    new Ranking(
      1,
      'Below Average',
      new Array()
    ),
    new Ranking(
      2,
      'Average',
      new Array()
    ),
    new Ranking(
      3,
      "Above Average",
      new Array()
    ),
    new Ranking(
      4,
      "Best",
      new Array()
    )
  );

  var team = new Team(1, 'Default', rankings);

  ko.applyBindings(new SRViewModel(team));
});