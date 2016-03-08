angular.module('hikexpert.comment', [])
  .controller('CommentFormController', function($scope, Home){
    $scope.submitComment = function(newComment){
      console.log(newComment);
    }
  }
