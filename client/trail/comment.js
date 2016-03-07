angular.module('hikexpert.comment', [])
  .controller('CommentFormController', function($scope, Home){
    $scope.submitComment = function(new-comment){
      console.log(new-comment);
    }
  }
