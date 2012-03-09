/// <reference path="../js/knockout-2.0.0.js" />
/// <reference path="../js/jquery-1.7.1.js" />

ko.bindingHandlers.rankingList = {
  init: function (element, valueAccessor, allBindingsAccessor, model) {
    var viewModel = valueAccessor();
    $(element).sortable({
      placeholder: 'hoverPlaceholder',
      connectWith: '.connectedSortable',
      dropOnEmpty: true,
      tolerance: 'touch',
      stop: function (event, ui) {
        var ranking = $(ui.item).parent();
        var personId = ui.item.attr('id');
        var rankingId = ui.item.attr('data-RankingId');
        var internalRankingList = ranking.sortable('toArray');
        var newIndex = internalRankingList.indexOf(personId);
        //If coming from the same ranking, we need to re-order
        if (this == ranking[0]) {
          viewModel.reorderPerson(newIndex, personId, rankingId);
        } else {
          //Otherwise, we are coming from another ranking, we need to remove and add in the correct position in the array
          var targetRankingId = ranking.attr('data-RankingId');
          viewModel.movePerson(newIndex, personId, rankingId, targetRankingId);
        }
      }
    });
  },
}

ko.bindingHandlers.selectText = {
  init: function (element, valueAccessor, allBindingsAccessor, model) {
    $(element).focus(function() {
      $(this).select();
    });
  }
}

ko.bindingHandlers.disableSelection = {
  init: function (element, valueAccessor, allBindingsAccessor, model) {
    $(element).disableSelection();
  }
}