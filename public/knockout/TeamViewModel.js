/// <reference path="../js/knockout-2.0.0.js" />
/// <reference path="../js/linq.min.js" />
var socket = io.connect();
//Shortcut for unwrapping observables
var unwrap = ko.utils.unwrapObservable;

/////  MODELS
var Person = function (PersonId, Name) {
  var self = this;
  self.PersonId = ko.observable(PersonId);
  self.Name = ko.observable(Name);
  self.Name.subscribe(function () {
    hasChanges(hasChanges() + 1);
  });
  self.EditPersonName = ko.observable(false);
}

var Ranking = function (RankingId, Name, People) {
  var self = this;
  self.RankingId = ko.observable(RankingId);
  //don't need to subscribe to RankingId changes as we currently do not support 
  self.Name = ko.observable(Name);
  self.Name.subscribe(function () {
    hasChanges(hasChanges() + 1);
  });
  self.People = ko.observableArray(People);
  self.EditRankingName = ko.observable(false);
}

var Team = function (TeamId, Name, Rankings) {
  var self = this;
  self.TeamId = TeamId;
  self.Name = ko.observable(Name);
  self.Name.subscribe(function () {
    hasChanges(hasChanges() + 1);
  });
  self.Rankings = ko.observableArray(Rankings);
  self.EditTeamName = ko.observable(false);
}

var hasChanges = ko.observable(0);

/////  VIEWMODEL
var TeamViewModel = function (team) {
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
    hasChanges(hasChanges() + 1);
  }

  self.movePerson = function (newIndex, personId, sourceRankingId, targetRankingId) {
    var sourceRanking = self.getRankingById(sourceRankingId);
    var targetRanking = self.getRankingById(targetRankingId);
    var person = self.getPersonFromRanking(personId, sourceRanking);
    sourceRanking.People.remove(person);
    targetRanking.People.splice(newIndex, 0, person);
    self.updatePersonIds(sourceRanking);
    self.updatePersonIds(targetRanking);
    hasChanges(hasChanges() + 1);
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
      hasChanges(hasChanges() + 1);
    } else {
      self.status('You cannot delete a ranking with people in it!');
    }
  }

  socket.on('message', function (data) {
    var outputTeam = self.createTeamFromObject(JSON.parse(data));
    self.team(outputTeam);
    self.status('Refreshed');
  });

  //Pulling the view model from the server
  self.refreshTeam = function () {    
    $.getJSON('/getTeam/' + self.team().TeamId, 
      function (data) {
        if (data) {
          var outputTeam = self.createTeamFromObject(data);
          self.team(outputTeam);
          self.status('Refreshed');
        } else {
          self.status('Error');
        }
      }
    );
  }

  self.saveTeam = function () {
    var outputTeam = self.createObjectFromTeam(self.team);
    $.post('/saveTeam/' + self.team().TeamId, outputTeam, 
      function (data) {
        self.status('Saved');
        socket.emit('dataChanged', { teamId: outputTeam.TeamId })
      }
    );
  }

  //Front-end list manipulation functions
  self.newPersonToRanking = function (ranking) {
    var newId = 'r' + ranking.RankingId() + 'p' + ranking.People().length;
    var personToAdd = new Person(newId, 'NewPerson');
    ranking.People.push(personToAdd);
    hasChanges(hasChanges() + 1);
  }
  self.removePersonFromRanking = function (person, element) {
    var rankingId = $($(element).parents('ul')).attr('data-RankingId');
    var ranking = self.getRankingById(rankingId);
    ranking.People.remove(person);
    self.updatePersonIds(ranking);
    hasChanges(hasChanges() + 1);
  }
  self.addRanking = function (model) {
    self.team().Rankings.push(new Ranking(self.team().Rankings().length, 'NewRanking', []));
    self.updateRankingIds();
    hasChanges(hasChanges() + 1);
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

  //For getting from the server
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
      self.updatePersonIds(ranking);
      rankings.push(ranking);
    });

    return new Team(team.TeamId, team.Name, rankings);
  }

  //For pushing to the server
  self.createObjectFromTeam = function (team) {
    var outputTeam = { 'TeamId': team().TeamId, 'Name': team().Name() };
    var rankings = unwrap(team().Rankings());
    var rankingArray = new Array();
    $.each(rankings, function (i, state) {
      var people = unwrap(state.People);
      var peopleArray = new Array();
      $.each(people, function (i, state) {
        var personObj = { 'Name': state.Name() }
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
  //Using a utility class from within the view model
  var viewModel = new TeamViewModel();
  $.getJSON('/getTeam/' + window.location.pathname.split('/').pop(), 
    function (data) {
      if (data) {
        var outputTeam = viewModel.createTeamFromObject(data);
        var thisPageViewModel = new TeamViewModel(outputTeam);
        hasChanges.subscribe(function (input) {
          thisPageViewModel.saveTeam();
        });
        ko.applyBindings(thisPageViewModel);
        socket.on('identifyUser', function (incoming) {
          socket.emit('userConnected', { teamId: outputTeam.TeamId })
        });
        $(".main").fadeIn();
      } else {
        window.location.href = '/';
      }
    }
  );
});