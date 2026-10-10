// Hopper, the little knight: a young horse in a too-big helmet. Excited, kind, never scary.
// Simple words, short sentences, lots of encouragement. Says "the other team" for the opponent.
// Kids get explicit help: Hopper always points at the danger instead of hinting.

export const HOPPER = {
  greet_first: [
    "Hi {name}! I'm Hopper, the little knight! I hop in an L shape, and I'm going to help you win! Ready?",
    "Hello, {name}! I'm Hopper! I'll be right here the whole game, and I'll tell you if anything's in danger. Let's play!",
  ],
  greet: [
    "Yay, you're back, {name}! [Let's play!|I missed you!|Ready to win?]",
    "Hi {name}! {opp} wants to play with us! [Let's go!|Ready?]",
    "Neigh-ho! It's chess time, {name}!",
    "Hooray! Another game! [I love chess!|This is my favourite thing!]",
    "Hi hi hi! {name}, let's have a super game!",
    "Clip-clop, here I come! Let's play, {name}!",
    "{name}! You're here! [{opp} is waiting for us.|I polished my helmet for this!]",
    "Ready, steady, chess! Hi {name}!",
  ],
  greet_after_loss: [
    "Last time was tricky, but that's okay! Every game makes you stronger. Let's try again!",
    "Don't worry about last game, {name}. Even the best players lose sometimes. This time, let's win!",
  ],
  greet_after_win: [
    "You won last time! That was amazing! Can you do it again?",
    "Woo-hoo, you're a winner! Let's play another one!",
  ],
  greet_test: [
    "You're on your own this time! I believe in you!",
    "This is a big-kid game! I'll be quiet and just watch. You can do it, {name}!",
    "Show me what you learned! I'll zip my lips. Good luck!",
  ],
  memory_open: [
    "Last game, {theme}. This time, let's {tip}",
    "Remember last game? {theme}. Today, let's {tip}",
    "I remember something from last time! {theme}. So let's {tip}",
    "Hey {name}, a secret tip! Last time it was {theme}. Today, let's {tip}",
  ],
  memory_open_pattern: [
    "Hmm, {theme} keeps happening. Let's beat it today! Let's {tip}",
  ],
  memory_open_improving: [
    "Guess what? You stopped {theme}! You're getting so good!",
  ],

  opening_develop: [
    "Let's wake up your knights and bishops! They want to play too!",
    "Bring out your pieces! The more friends on the board, the better!",
  ],
  opening_center: [
    "The middle of the board is the best place to be! Can a pawn go there?",
  ],
  opening_castle: [
    "Your king is in the middle. Let's castle and keep him safe in his castle!",
    "Kings like to hide in their castle. Can you castle?",
  ],
  opening_queen_early: [
    "Careful, the queen is very special! Let's not send her out too soon.",
  ],
  opening_same_piece: [
    "That piece is getting tired! Let's move a different one.",
  ],
  opening_edge_knight: [
    "Knights like the middle more than the edge. That's where I like to be too!",
  ],

  praise_best: [
    "Super duper move!",
    "That's a star move! ⭐",
    "Ooh, you're good at this!",
    "Whoa! Great move!",
    "Perfect-o!",
    "Wow! That's the best move!", "Yes yes yes! Super move!", "Amazing, {name}!", "You're a chess star!",
    "That's exactly what I would do!", "Woo-hoo! Great move!", "Brilliant!", "You're so smart!",
    "High hoof! That was perfect!", "Ooh, I love that move!",
  ],
  praise_good: [
    "Good one!",
    "Nice move!",
    "Okay!",
    "Cool move!",
    "Nice!", "Good move!", "Good thinking!", "That works!", "Okay, cool!", "Nice one!", "Great!",
  ],
  praise_capture: [
    "Got it! The {took} is yours!",
    "Nom nom! You captured the {took}!",
    "Great catch! One {took} for you!",
    "Woo! The {took} goes in your pile!",
    "You took the {took}! Super!",
    "Yum! You got the {took}!", "You captured a {took}! Hooray!", "The {took} is yours! Great job!",
    "Chomp! Bye-bye, {took}!",
  ],
  praise_fork: [
    "Double attack! You're amazing!",
    "Your {piece} is attacking two pieces! Wow!",
    "A fork! Your {piece} is attacking two pieces at once! So cool!",
    "Wow, a double attack! The other team can't save both!",
  ],
  praise_pin: [
    "You made a pin! That piece is stuck now!",
  ],
  praise_check: [
    "Check! Run, king, run!",
    "Check! You're so brave!",
    "Check! The king has to run!", "Check! Nice!",
  ],
  praise_castle: [
    "The king is cozy in his castle now!",
    "Castle time! Great job!",
    "You castled! The king is safe in his castle now!", "Yay, castle time! Great job keeping the king safe!",
  ],
  praise_defend: [
    "You protected it! Good job!",
    "Safe and sound! Nice!",
    "You saved your piece! Hooray!",
    "Great job keeping everyone safe!",
    "You saw the danger! You're so smart!",
    "You saved it! Great job!", "Phew! You kept it safe!", "You saw the danger! Super!",
  ],
  praise_mate: [
    "Checkmate! You're a champion!",
    "You won with a checkmate! Wow wow wow!",
    "CHECKMATE! You did it! You won!", "Checkmate! Hooray hooray!",
  ],
  praise_after_takeback: [
    "You fixed it! Hooray!",
    "Much better! High hoof!",
    "Yes! Good thinking!",
    "Yes! Much better!", "That's it! You got it!", "Great fix!", "Perfect! See? You can do it!",
  ],
  inaccuracy: [
    "Okay! {best} was even better, but that's fine!",
  ],

  opp_develops: [
    "Here comes their {piece}!",
    "Their {piece} moved!",
    "The other team moved their {piece}.", "{opp} moved a {piece}.", "Their {piece} came out to play.",
  ],
  opp_captures: [
    "They got your {took}. That's okay, let's keep playing!",
    "Oops, they took your {took}!",
    "Oh no, they took your {took}!", "They captured your {took}. Can you take something back?",
  ],
  opp_checks: [
    "Check! Let's help the king!",
    "Your king is in check! What can we do?",
    "Check! Your king is in danger! Let's keep him safe.",
    "Uh-oh, check! Move your king, block, or take the attacker!",
  ],
  opp_castles: [
    "The other king went into his castle.",
  ],
  opp_quiet: [
    "The other team is thinking hard!",
    "Hmm, sneaky sneaky!",
    "They moved their {piece}.",
    "Your turn! What will you do?",
    "Hmm, what are they planning?", "The other team made a sneaky move.",
  ],
  opp_blunder: [
    "Look! Look! Their {piece} is in trouble!",
    "Ooh, the other team made a mistake!",
    "Ooh! I think they made a mistake! Look at their {piece}!",
    "Psst! Their {piece} has no friends to protect it!",
  ],
  opp_blunder_explicit: [
    "Look! Their {piece} is all alone! Can you capture it?",
    "Their {piece} on the glowing square is free to take!",
  ],
  opportunity: [
    "Ooh, I see something good for you! Look really carefully!",
    "There's a super move here! Can you find it?",
  ],

  warn_threat: [
    "Look! Your {piece} could get eaten!",
    "Your {piece} is in trouble! Can you help it?",
    "Oh no! The {by} is attacking your {piece}!",
    "Psst! Your {piece} is not safe!",
    "Uh-oh! Their {by} wants to eat your {piece}!", "Watch out! Your {piece} is in danger!",
    "Look! Your {piece} needs help! Their {by} is attacking it.", "Oh no, your {piece}! Can you save it?",
    "Careful! The {by} is coming for your {piece}!",
  ],
  warn_threat_vague: [
    "Look carefully! Is anything in danger?",
  ],
  warn_mate: [
    "Watch out! Your king needs help!",
    "Danger! Your king could get checkmated! Let's protect him!",
    "Oh no, watch your king! They're trying to checkmate!",
  ],
  in_check: [
    "Your king is in check! Let's keep him safe!",
  ],

  iv_open: [
    "Wait a second!",
    "Hmm, wait!",
    "Hold on, {name}!",
    "Wait wait wait!", "Uh-oh!", "Oops!", "Hold your horses!", "Whoa, stop!", "Oh no!",
  ],
  iv_hang: [
    "Oops! Your {piece} would be all alone there! The {by} can take it.",
    "Uh-oh, nobody is protecting your {piece}!",
    "Your {piece} doesn't have any friends protecting it! Their {by} can take it.",
    "If you do that, their {by} can eat your {piece}!",
    "Your {piece} is all alone! The {by} can grab it.",
  ],
  iv_hang_moved: [
    "That square isn't safe! The {by} can get your {piece}!",
    "That square is dangerous! Their {by} can take your {piece} there.",
    "Uh-oh, your {piece} went somewhere scary! The {by} is watching that square.",
  ],
  iv_fork: [
    "Their {by} could attack two of your pieces at once!",
  ],
  iv_pin: [
    "That would get one of your pieces stuck!",
  ],
  iv_mate_threat: [
    "Wait! Your king could get checkmated! Let's try something else!",
    "That lets them checkmate your king! Let's try again!",
    "Oh no, your king is in big danger after that!",
  ],
  iv_missed_mate: [
    "Wait! You could have done checkmate! Want to try again?",
    "There's a checkmate! Can you find it?",
  ],
  iv_missed_tactic: [
    "Ooh, there was something to capture! Want to look again?",
    "Ooh, there was a super move you missed! Want to look again?",
    "You could have won something! Try again?",
  ],
  iv_missed_fork: [
    "Your {piece} could attack two pieces at once! Find the magic square!",
  ],
  iv_ignored_threat: [
    "Your {piece} still needs help! The {by} is coming!",
    "Your {piece} was in danger, and it still is! The {by} can take it.",
    "Remember your {piece}? It still needs help!",
  ],
  iv_bad_trade: [
    "Your {piece} is worth more! Let's keep it!",
    "Careful! Your {piece} is worth more than their {took}. That's not a fair trade!",
  ],
  iv_king_safety: [
    "Those pawns protect your king! Let's leave them home.",
  ],
  iv_opening: [
    "Let's bring out a new piece instead!",
  ],
  iv_endgame: [
    "Hmm, there's a better move here! Want to try again?",
  ],
  iv_positional: [
    "Hmm, there's a better move! Want to try again?",
  ],
  iv_memory: [
    "Remember last game? The same thing happened!",
    "This happened before! Remember your {mpiece}?",
  ],
  iv_memory_pattern: [
    "This keeps happening! Let's beat it together!",
  ],
  iv_memory_game: [
    "This happened before in this game!",
  ],
  iv_offer: [
    "Let's try again!",
    "Want to pick a different move?",
    "Want to try again?", "Let's try a different move!", "Try again?",
  ],
  iv_offer_none: [
    "Let's keep going!",
  ],
  takeback_done: [
    "Let's look again!",
    "Okay! Which piece needs help?",
    "Let's find a safe move!",
    "Okay! Look carefully now!", "Let's find a better move!", "You can do it! Look around!",
    "Look at the glowing pieces!", "Take your time!",
  ],
  takeback_last: [],
  play_on: [
    "Okay, let's see!",
    "Alright! Let's keep playing!",
    "Okay! Let's keep going!", "Let's see what happens!", "You're the boss!",
  ],
  show_reply: [
    "Watch out for this move!",
    "See the arrow? That's what they would do!",
    "See? They would go {reply}!", "Look! This is what they would do.",
  ],
  show_mate: [
    "See? That would be checkmate!",
  ],
  show_best: [
    "This one is better: {best}!",
    "Look at the green arrow!",
    "Try this one: {best}!", "How about {best}?",
  ],

  hint_1: [
    "Can you capture anything?",
    "Are all your pieces safe?",
    "Look for things you can capture!", "Is anything of yours in danger?", "Can you give check?",
  ],
  hint_2: [
    "What can your {piece} do?",
    "Your {piece} wants to move!",
    "Try moving your {piece}!", "Your {piece} has a good move!", "Look at the glowing {piece}!",
  ],
  hint_3: [
    "Move it here! {best}!", "Try {best}!",
  ],
  hint_none_needed: [
    "Everything is safe! Bring out a new piece!",
    "Let's wake up a sleepy piece!",
    "Everything's safe! Bring out a new piece!",
  ],
  threat_is: [
    "They want to capture your {piece}!",
    "Your {piece} is in danger! They want to take it!",
    "They want to take your {piece}!",
  ],
  threat_mate_is: [
    "They want to checkmate your king! Protect him!",
  ],
  threat_none: [
    "Nobody's in danger! Yay!",
    "All safe for now!",
    "Everything is safe right now!",
  ],
  explain_opp_dev: [
    "They're bringing out their {piece}.",
  ],
  plan_develop: [
    "Wake up your knights and bishops, then castle!",
    "Bring out your pieces and castle your king!",
  ],
  plan_winning: [
    "You're winning! Keep everyone safe and capture more!",
    "You're winning! Keep your pieces safe!",
  ],
  plan_losing: [
    "Don't give up! Look for pieces you can capture!",
    "Let's keep trying! The other team can make mistakes too!",
  ],
  plan_equal: [
    "Look for things to capture and keep your pieces safe!",
    "Look for pieces you can capture, and keep yours safe!",
  ],
  plan_endgame: [
    "Push your pawns to make a new queen!",
    "Push your pawns! They can become queens!",
  ],
  plan_mate: [
    "Let's trap their king! Push him to the edge!",
    "Let's checkmate! Push their king to the edge!",
  ],
  status_winning: [
    "You're doing great!",
    "You're in the lead!",
    "You're winning! Woo-hoo!", "You have more pieces! Great job!",
  ],
  status_losing: [
    "Keep trying! You can do it!",
    "Don't give up! You can still win!",
  ],
  status_turnaround: [
    "Wow, you're back in the game!",
  ],
  endgame_start: [
    "Only a few pieces left! Let's be super careful!",
    "Not many pieces left! Your king can come out and help now!",
  ],
  clock_low: [
    "Hurry, the clock is running out!",
  ],
  filler: [
    "Did you know a pawn can become a queen if it reaches the other side?",
    "I hop in an L shape! Two squares, then one to the side!",
    "Bishops always stay on the same colour. Cool, right?",
    "The queen is the strongest piece! Keep her safe!",
    "Rooks go in straight lines, zoom zoom!",
    "Look at all the pieces before you move!",
    "I'm a knight, and I can jump over other pieces!",
  ],
  end_win: [
    "You won! You're the best!",
    "Champion! You did it!",
    "YOU WON! Hooray! You're a chess champion, {name}!", "Victory! You did it, {name}! I'm so proud!",
    "You won! Let's do a happy dance!",
  ],
  end_win_comeback: [
    "You never gave up, and you won! That's what heroes do!",
  ],
  end_loss: [
    "Good try! Let's play again and win!",
    "That's okay! You're getting better every game!",
    "Aw, not this time. But you learned something! Let's play again!",
    "That's okay, {name}! Every game makes you stronger!",
  ],
  end_draw: [
    "A tie! Good game!",
    "It's a tie! Nobody won, and that's okay!",
  ],
  end_timeout_loss: ["Oh no, the clock ran out! Next time, let's move a little faster."],
  end_timeout_win: ["Their clock ran out! You win!"],
  end_resign: ["Okay! Let's start a new game!"],
  card_intro: [
    "Let's remember these three things!",
    "Here are three things to remember!", "Three super tips for next time!",
  ],
};

export const HOPPER_THEMES = {
  hang: ['a piece got left all alone', 'look if every piece has a friend protecting it'],
  mate_threat: ['the king got into danger', 'check if your king is safe after every move'],
  missed_mate: ['we missed a checkmate', 'look for checks every time'],
  missed_tactic: ['we missed a capture', 'look for things you can capture first'],
  missed_fork: ['we missed a double attack', 'look for a piece that can attack two things'],
  ignored_threat: ["we didn't see a piece in danger", 'look at what their last move attacks'],
  bad_trade: ['a big piece got traded for a little one', 'count before you capture'],
  king_safety: ['the king lost his pawn wall', 'keep the pawns in front of your king'],
  opening: ['some pieces stayed asleep', 'bring out a new piece each move at the start'],
  endgame: ['the ending got tricky', 'use your king and push your pawns'],
  positional: ['a sleepy move', 'find a piece that wants a better square'],
};
