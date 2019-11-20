// Spaced Repetition is an efficient learning system that attempts to quiz the
// user with flash cards at specific intervals for maximum memory retention.
// The quiz interval is determined by the (0-5) rating the user gives after seeing
// each card, and increases or decreases depending on difficulty.

// The algorithm implemented here is the SM-2 algorithm used in the SuperMemo-2
// software as well as the popular open source Anki software.
// The algorithm is described here: http://www.supermemo.com/english/ol/sm2.htm

// Open Source MIT LICENSE
// This code lives here: https://github.com/joedel/spaced-repetition/
// Any feedback or tips to improve greatly appreciated.

// ability to manipulate the command line.

//today = today.setHours(0,0,0,0);

var cardQuizCount = function cardQuizC(cards) {
  var today = new Date();
  var count = 0;
  for (cName in cards) {
    var card = cards[cName];
    var date = new Date(card.nextDate);
    if (card.interval === 0 || !card.interval || date.getTime() <= today.getTime()) {
      count++;
    }
  }
  return count;
}

exports.cardQuizCount = cardQuizCount;


// SM-2:
// EF (easiness factor) is a rating for how difficult the card is.
// Grade: (0-2) Set reps and interval to 0, keep current EF (repeat card today)
//        (3)   Set interval to 0, lower the EF, reps + 1 (repeat card today)
//        (4-5) Reps + 1, interval is calculated using EF, increasing in time.
var calcIntervalEF = function calcIntervalEF(card, grade) {
  today = new Date();
  var oldEF = card.EF,
      newEF = 0,
      nextDate = new Date(today);

  if (grade < 3) {
    card.reps = 0;
    card.interval = 0;
  } else {

    newEF = oldEF + (0.1 - (5-grade)*(0.08+(5-grade)*0.02));
    if (newEF < 1.3) { // 1.3 is the minimum EF
      card.EF = 1.3;
    } else {
      card.EF = newEF;
    }

    card.reps = card.reps + 1;

    switch (card.reps) {
      case 1:
        card.interval = 1;
        break;
      case 2:
        card.interval = 6;
        break;
      default:
        card.interval = Math.round((card.reps - 1) * card.EF);
        break;
    }
  }

  if (grade === 3) {
    card.interval = 0;
  }

  nextDate.setDate(today.getDate() + card.interval);
  card.nextDate = nextDate.toString();
  return card;
}

exports.calcIntervalEF = calcIntervalEF;
