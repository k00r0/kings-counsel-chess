// The three learning paths. Every chess position here is checked by tools/validate-lessons.mjs
// (legal, and the solution really is the right move) before it ships.
//
// Step types:
//   { t: 'say', text, kids?, fen?, arrows?, marks? }                    the coach explains (tap Continue)
//   { t: 'stars', piece, start, stars: [], rocks: [], par, text }       kids' quest: collect the stars
//   { t: 'find', fen, sol: [uci...], goal, text, done?, hint? }         find the move (goal: best|good|mate|check|capture|safe|castle|any)
//                                                                        sol '*' = the engine's best reply (filled in at build time)
//   { t: 'play', fen, goal: mate|promote|win|hold, moves, text }        play it out against the engine
//   { t: 'mined', theme, count, min, max, text }                         puzzles from the puzzle bank (filled in at build time)

export const PATHS = [
  {
    id: 'squire', title: 'Squire', blurb: 'For young players: meet the pieces, capture, check and checkmate, with Hopper.',
    units: [
      { id: 'sq-pieces', title: 'Meet the pieces', icon: '🏰', lessons: [
        { id: 'sq-rook', title: 'The Rook', steps: [
          { t: 'say', text: "This is the rook! It looks like a castle tower. It zooms in straight lines: up, down, left and right, as far as it wants!", fen: '8/8/8/8/3R4/8/8/8 w - - 0 1', marks: [{ sq: 'd8', kind: 'hint' }, { sq: 'd1', kind: 'hint' }, { sq: 'a4', kind: 'hint' }, { sq: 'h4', kind: 'hint' }] },
          { t: 'stars', piece: 'wr', start: 'a1', stars: ['a6', 'f6', 'f1'], par: 3, text: 'Collect all the stars with your rook! Tap the rook, then tap where it should go.' },
          { t: 'stars', piece: 'wr', start: 'a1', stars: ['a8'], rocks: ['a5'], par: 3, text: "Uh-oh, a rock! Rooks can't jump over things. Find a way around to the star!" },
          { t: 'stars', piece: 'wr', start: 'h8', stars: ['b8', 'b3', 'g3', 'g6', 'd6'], rocks: ['e8', 'b5'], par: 7, text: 'A big one! Get every star.' },
        ] },
        { id: 'sq-bishop', title: 'The Bishop', steps: [
          { t: 'say', text: 'This is the bishop. It slides on the diagonals, like going up a staircase! And it always stays on the same colour.', fen: '8/8/8/8/3B4/8/8/8 w - - 0 1', arrows: [{ uci: 'd4h8', color: 'hint' }, { uci: 'd4a7', color: 'hint' }, { uci: 'd4a1', color: 'hint' }, { uci: 'd4g1', color: 'hint' }] },
          { t: 'stars', piece: 'wb', start: 'c1', stars: ['h6', 'f8'], par: 2, text: 'Slide along the diagonals to get the stars!' },
          { t: 'stars', piece: 'wb', start: 'f1', stars: ['a6', 'c8', 'h3'], par: 3, text: 'Three stars, all on light squares. Can you do it in three moves?' },
          { t: 'stars', piece: 'wb', start: 'a1', stars: ['h8', 'e5', 'g3', 'b8'], rocks: ['d4'], par: 6, text: 'Watch out for the rock in the middle!' },
        ] },
        { id: 'sq-queen', title: 'The Queen', steps: [
          { t: 'say', text: "The queen is the most powerful piece! She moves like a rook AND a bishop: straight lines and diagonals.", fen: '8/8/8/8/3Q4/8/8/8 w - - 0 1', arrows: [{ uci: 'd4d8', color: 'hint' }, { uci: 'd4h8', color: 'hint' }, { uci: 'd4h4', color: 'hint' }, { uci: 'd4g1', color: 'hint' }, { uci: 'd4d1', color: 'hint' }, { uci: 'd4a1', color: 'hint' }, { uci: 'd4a4', color: 'hint' }, { uci: 'd4a7', color: 'hint' }] },
          { t: 'stars', piece: 'wq', start: 'd1', stars: ['d8', 'h4', 'a4'], par: 3, text: 'Zoom around the board with the queen!' },
          { t: 'stars', piece: 'wq', start: 'e4', stars: ['a8', 'h1', 'h7', 'b1'], par: 4, text: 'Four stars, four moves. Ready?' },
        ] },
        { id: 'sq-knight', title: 'The Knight (me!)', steps: [
          { t: 'say', text: "That's me! Knights move in an L: two squares one way, then one square to the side. And knights can JUMP over things!", fen: '8/8/8/8/3N4/8/8/8 w - - 0 1', marks: ['b3', 'b5', 'c2', 'c6', 'e2', 'e6', 'f3', 'f5'].map(sq => ({ sq, kind: 'hint' })) },
          { t: 'stars', piece: 'wn', start: 'b1', stars: ['c3', 'd5', 'f6'], par: 3, text: 'Hop, hop, hop! Get the stars.' },
          { t: 'stars', piece: 'wn', start: 'g1', stars: ['h3', 'f4', 'e6', 'g7'], rocks: ['g2', 'h2', 'f2'], par: 4, text: "Rocks don't stop a knight. Jump right over them!" },
          { t: 'stars', piece: 'wn', start: 'a1', stars: ['b3', 'd4', 'f5', 'h6'], par: 4, text: 'Climb up the board in L-shapes!' },
        ] },
        { id: 'sq-king', title: 'The King', steps: [
          { t: 'say', text: 'The king is the most important piece! He moves just one square, any direction. We must keep him safe.', fen: '8/8/8/8/3K4/8/8/8 w - - 0 1', marks: ['c3', 'c4', 'c5', 'd3', 'd5', 'e3', 'e4', 'e5'].map(sq => ({ sq, kind: 'hint' })) },
          { t: 'stars', piece: 'wk', start: 'e1', stars: ['e2', 'f3', 'g4'], par: 3, text: 'One step at a time, little king!' },
          { t: 'stars', piece: 'wk', start: 'a1', stars: ['b2', 'c2', 'c3', 'b3'], par: 4, text: 'Walk around and collect them all.' },
        ] },
        { id: 'sq-pawn', title: 'The Pawn', steps: [
          { t: 'say', text: 'Pawns are little but brave! They walk forward one square. On their very first move, they can go two squares!', fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', arrows: [{ uci: 'e2e4', color: 'hint' }] },
          { t: 'find', fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', sol: ['e2e4'], goal: 'best', alt: false, text: 'Move your pawn two squares forward!' },
          { t: 'say', text: 'Pawns capture differently: one square diagonally forward. Like a little sideways chomp!', fen: '4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1', arrows: [{ uci: 'e4d5', color: 'good' }] },
          { t: 'find', fen: '4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1', sol: ['e4d5'], goal: 'best', alt: false, text: 'Capture the black pawn with your pawn!' },
          { t: 'say', text: 'Here is the magic part: when a pawn reaches the other side, it turns into a queen!', fen: '4k3/P7/8/8/8/8/8/4K3 w - - 0 1' },
          { t: 'play', fen: '4k3/P7/8/8/8/8/8/4K3 w - - 0 1', goal: 'promote', moves: 2, text: 'Push your pawn to the end and make a queen!' },
        ] },
      ] },
      { id: 'sq-capture', title: 'Capture!', icon: '🍎', lessons: [
        { id: 'sq-free', title: 'Free pieces', steps: [
          { t: 'say', text: "When a piece has no friends protecting it, you can capture it for free! Let's find some free pieces." },
          { t: 'find', fen: '4k3/8/8/3q4/8/8/3R4/4K3 w - - 0 1', sol: ['d2d5'], goal: 'capture', text: 'The black queen is all alone! Capture her with your rook!' },
          { t: 'find', fen: '4k3/8/2n5/8/8/5B2/8/4K3 w - - 0 1', sol: ['f3c6'], goal: 'capture', text: 'Find the free knight!' },
          { t: 'find', fen: 'r3k3/8/8/8/8/8/8/R3K3 w - - 0 1', sol: ['a1a8'], goal: 'capture', text: 'Can you capture something big?' },
          { t: 'find', fen: '4k3/8/8/4r3/8/3N4/8/4K3 w - - 0 1', sol: ['d3e5'], goal: 'capture', text: 'Hop over and grab the rook!' },
          { t: 'mined', theme: 'hanging', count: 3, max: 650, text: 'Find the free piece!' },
        ] },
        { id: 'sq-safe', title: 'Keep it safe', steps: [
          { t: 'say', text: "Sometimes the other team attacks YOUR piece. Then you move it somewhere safe, or protect it, or capture the attacker!" },
          { t: 'find', fen: '4k3/8/8/8/1r6/8/8/1N2K3 w - - 0 1', sol: ['b1c3'], goal: 'safe', text: 'The rook wants to take your knight! Move the knight to a safe square.' },
          { t: 'find', fen: '3k4/8/8/3p4/4Q3/8/8/4K3 w - - 0 1', sol: ['e4d5'], goal: 'safe', text: 'A pawn is attacking your queen! What can you do?' },
          { t: 'find', fen: '4k3/8/5b2/8/8/8/1R6/4K3 w - - 0 1', sol: ['b2b6'], goal: 'safe', text: 'The bishop is attacking your rook. Keep it safe!' },
        ] },
        { id: 'sq-check', title: 'Check!', steps: [
          { t: 'say', text: 'When you attack the king, that is called CHECK! The king must get out of danger right away.', fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', arrows: [{ uci: 'a1a8', color: 'hint' }] },
          { t: 'find', fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', sol: ['a1a8'], goal: 'check', text: 'Give check with your rook!' },
          { t: 'find', fen: '4k3/8/8/8/2B5/8/8/4K3 w - - 0 1', sol: ['c4b5'], goal: 'check', text: 'Give check with your bishop!' },
          { t: 'find', fen: '4k3/8/8/8/8/8/8/3QK3 w - - 0 1', sol: ['d1a4'], goal: 'check', text: 'Give check with your queen!' },
          { t: 'say', text: "When YOUR king is in check, there are three ways out: move the king, block the attack, or capture the attacker." },
          { t: 'find', fen: '4k3/8/8/8/8/8/4r3/R3K3 w - - 0 1', sol: ['e1e2'], goal: 'safe', text: "Your king is in check! The rook is right next to him, and nobody protects it..." },
        ] },
      ] },
      { id: 'sq-mate', title: 'Checkmate!', icon: '👑', lessons: [
        { id: 'sq-mate1', title: 'What is checkmate?', steps: [
          { t: 'say', text: "Checkmate means the king is in check and can't escape. That wins the game! Look: the rook gives check, and the king is stuck behind his own pawns.", fen: '3R2k1/5ppp/8/8/8/8/8/6K1 b - - 0 1', marks: [{ sq: 'g8', kind: 'danger' }] },
          { t: 'find', fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', sol: ['a1a8'], goal: 'mate', text: 'Your turn! Checkmate the king with your rook!' },
          { t: 'find', fen: '7k/Q7/6K1/8/8/8/8/8 w - - 0 1', sol: ['a7g7'], goal: 'mate', text: 'The king helps the queen. Find checkmate!' },
          { t: 'find', fen: '7k/R7/8/8/8/8/8/1R4K1 w - - 0 1', sol: ['b1b8'], goal: 'mate', text: 'Two rooks working together. Checkmate!' },
          { t: 'find', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', sol: ['h5f7'], goal: 'mate', text: 'A real game! Can you find checkmate in one move?' },
        ] },
        { id: 'sq-mate2', title: 'More checkmates', steps: [
          { t: 'mined', theme: 'mate1', count: 6, max: 800, text: 'Find checkmate in one!' },
        ] },
        { id: 'sq-castle', title: 'Castling', steps: [
          { t: 'say', text: 'Castling is a special move to keep your king safe. The king moves two squares toward a rook, and the rook jumps over to the other side!', fen: '4k3/8/8/8/8/8/PPPPPPPP/R3K2R w KQ - 0 1', arrows: [{ uci: 'e1g1', color: 'hint' }] },
          { t: 'find', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', sol: ['e1g1'], goal: 'castle', text: 'Castle your king! Move him two squares toward a rook.' },
          { t: 'say', text: "Remember: you can only castle if the king and that rook haven't moved yet, and the king isn't in check." },
        ] },
        { id: 'sq-queenmate', title: 'Queen and king team-up', steps: [
          { t: 'say', text: "With a queen and your king, you can always checkmate! Push the other king to the edge, bring your king close, then checkmate." },
          { t: 'play', fen: 'k7/8/1K6/8/8/8/7Q/8 w - - 0 1', goal: 'mate', moves: 3, text: 'The king is in the corner. Finish him off!' },
          { t: 'play', fen: '2k5/8/2K5/8/8/8/8/7Q w - - 0 1', goal: 'mate', moves: 4, text: 'Another one! Find the checkmate.' },
        ] },
      ] },
    ],
  },
  {
    id: 'knight', title: 'Knight', blurb: 'From about 400 to 1200: stop hanging pieces, learn the tactics that win games, and finish them off.',
    units: [
      { id: 'kn-safety', title: 'Never hang a piece', icon: '🛡', lessons: [
        { id: 'kn-blunder', title: 'The blunder check', steps: [
          { t: 'say', text: "Most games under 1200 are decided by one thing: a piece left hanging. Strong players run the same check before every move. Three questions: what are his checks, captures and threats? Then: after my move, is everything of mine protected?" },
          { t: 'find', fen: '4k3/8/8/8/1r6/8/8/1N2K3 w - - 0 1', sol: ['b1c3'], goal: 'safe', text: "Your knight is attacked and undefended. Save it." },
          { t: 'find', fen: '3k4/8/8/3p4/4Q3/8/8/4K3 w - - 0 1', sol: ['e4d5'], goal: 'safe', text: 'The pawn attacks your queen. Best response?' },
          { t: 'mined', theme: 'hanging', count: 5, min: 450, max: 750, text: 'Something of his is hanging. Take it.' },
        ] },
        { id: 'kn-defence', title: 'Only one move saves you', steps: [
          { t: 'say', text: "Sometimes there's exactly one move that keeps you in the game. Before you play the natural move, ask what he threatens." },
          { t: 'mined', theme: 'defence', count: 5, max: 1250, text: 'Find the only move that holds.' },
        ] },
      ] },
      { id: 'kn-tactics', title: 'Tactics that win', icon: '⚔', lessons: [
        { id: 'kn-fork', title: 'Forks', steps: [
          { t: 'say', text: 'A fork is one piece attacking two at once. He can only save one. Knights are the best forkers, because their attack is hard to see coming.', fen: 'r3k3/2N5/8/8/8/8/8/4K3 b - - 0 1', arrows: [{ uci: 'c7e8', color: 'danger' }, { uci: 'c7a8', color: 'danger' }] },
          { t: 'find', fen: 'q3k3/ppp2ppp/8/3N4/8/8/PPP2PPP/4K3 w - - 0 1', sol: ['d5c7'], goal: 'best', text: 'Find the fork: check the king and hit the queen.' },
          { t: 'find', fen: '2q3k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1', sol: ['d5e7', '*', 'e7c8'], goal: 'best', text: 'Check the king and hit the queen at the same time.' },
          { t: 'mined', theme: 'fork', count: 5, text: 'Find the fork.' },
        ] },
        { id: 'kn-pin', title: 'Pins and skewers', steps: [
          { t: 'say', text: "A pin: a piece can't move because something more valuable stands behind it. A skewer is the reverse: you attack the big piece, it moves, and you take what was behind it." },
          { t: 'find', fen: '8/8/8/4k2q/8/8/8/R5K1 w - - 0 1', sol: ['a1a5', '*', 'a5h5'], goal: 'best', text: 'Skewer the king and the queen.' },
          { t: 'mined', theme: 'pin', count: 4, text: 'Use the pin.' },
        ] },
        { id: 'kn-discovered', title: 'Discovered attacks', steps: [
          { t: 'say', text: "Move one piece out of the way, and the piece behind it attacks. Two threats at once, from two different pieces." },
          { t: 'mined', theme: 'combination', count: 4, max: 1150, text: 'Find the move that wins material.' },
        ] },
      ] },
      { id: 'kn-mates', title: 'Checkmate patterns', icon: '♚', lessons: [
        { id: 'kn-backrank', title: 'The back rank', steps: [
          { t: 'say', text: "A castled king behind three pawns has no escape square. One rook or queen on the back rank, and it's mate. Give your king some air (a pawn move like h3) when you have a quiet moment.", fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', arrows: [{ uci: 'a1a8', color: 'good' }] },
          { t: 'find', fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', sol: ['a1a8'], goal: 'mate', text: 'Mate in one.' },
        ] },
        { id: 'kn-mate1', title: 'Mate in one', steps: [{ t: 'mined', theme: 'mate1', count: 8, text: 'Mate in one.' }] },
        { id: 'kn-mate2', title: 'Mate in two', steps: [
          { t: 'say', text: "Mate in two: the first move is usually a check or a sacrifice that drags his king into the net. Check every check." },
          { t: 'mined', theme: 'mate2', count: 6, text: 'Mate in two.' },
        ] },
      ] },
      { id: 'kn-opening', title: 'Opening principles', icon: '🏁', lessons: [
        { id: 'kn-develop', title: 'Develop, centre, castle', steps: [
          { t: 'say', text: "In the first ten moves, you want three things: pawns in the centre, knights and bishops out, and your king castled. Don't move the same piece twice, and don't bring your queen out early." },
          { t: 'find', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', sol: ['e2e4'], goal: 'good', text: 'First move. Claim the centre.' },
          { t: 'find', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', sol: ['g1f3'], goal: 'good', text: 'Develop a piece, ideally with a threat.' },
          { t: 'find', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', sol: ['f1c4'], goal: 'good', text: 'Bring out another piece, one that eyes his weak spot on f7.' },
          { t: 'find', fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5', sol: ['e1g1'], goal: 'castle', text: 'Everything is ready. Make your king safe.' },
        ] },
        { id: 'kn-traps', title: 'Early traps', steps: [
          { t: 'say', text: 'The Scholar\'s Mate: queen and bishop gang up on f7, the weakest square in the opening. Learn to deliver it, and learn to stop it.' },
          { t: 'find', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', sol: ['h5f7'], goal: 'mate', text: 'Black just played Nf6. Punish it.' },
          { t: 'find', fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', sol: ['g7g6'], goal: 'safe', text: "Now you're Black. White threatens Qxf7 mate. Stop it." },
        ] },
      ] },
      { id: 'kn-endings', title: 'Finishing the game', icon: '🏰', lessons: [
        { id: 'kn-qmate', title: 'Queen and king mate', steps: [
          { t: 'say', text: "The method: use your queen a knight's move away from his king to shrink his box. When he's on the edge, bring your king up, then mate. Watch out for stalemate: always leave him a square until the final blow." },
          { t: 'play', fen: '8/8/8/4k3/8/8/8/4K2Q w - - 0 1', goal: 'mate', moves: 15, text: 'Checkmate within 15 moves.' },
        ] },
        { id: 'kn-rmate', title: 'Rook and king mate', steps: [
          { t: 'say', text: "With a rook it takes longer. Cut his king off with the rook, bring your king opposite his, then check. Each time, the box gets smaller." },
          { t: 'play', fen: '8/8/8/3k4/8/8/8/R3K3 w - - 0 1', goal: 'mate', moves: 25, text: 'Checkmate within 25 moves.' },
        ] },
        { id: 'kn-pawn', title: 'Promote the pawn', steps: [
          { t: 'say', text: "King and pawn against king: your king leads the way, the pawn follows. A king on the sixth rank in front of its pawn always wins." },
          { t: 'play', fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', goal: 'promote', moves: 8, text: 'Promote the pawn.' },
        ] },
      ] },
    ],
  },
  {
    id: 'master', title: 'Master', blurb: 'From 1200 towards 1800: precise endgames, deeper tactics, and defence under pressure.',
    units: [
      { id: 'ma-endings', title: 'Endgame essentials', icon: '♜', lessons: [
        { id: 'ma-opposition', title: 'The opposition', steps: [
          { t: 'say', text: "When the kings face each other with one square between them, the side NOT to move has the opposition. In pawn endings that's often the whole game." },
          { t: 'play', fen: '8/8/4k3/8/4K3/8/4P3/8 w - - 0 1', goal: 'promote', moves: 14, text: 'Your king is two squares in front of the pawn. That always wins. Show me.' },
          { t: 'play', fen: '8/8/4k3/8/8/4K3/4P3/8 w - - 0 1', goal: 'promote', moves: 14, text: 'Harder: take the opposition first, then promote.' },
        ] },
        { id: 'ma-lucena', title: 'Lucena: building a bridge', steps: [
          { t: 'say', text: "The Lucena position: your pawn is on the seventh, your king in front of it. Cut his king off with the rook, then use the rook as a bridge to block the checks." },
          { t: 'play', fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', goal: 'promote', moves: 15, text: 'Win it. Promote safely.' },
        ] },
        { id: 'ma-philidor', title: 'Philidor: the drawing wall', steps: [
          { t: 'say', text: "The Philidor defence: keep your rook on your third rank so his king can't come forward. The moment his pawn advances, swing the rook behind and check from a distance." },
          { t: 'play', fen: '3k4/8/r7/3PK3/8/8/8/4R3 b - - 0 1', goal: 'hold', moves: 12, text: "You're Black. Hold the draw for 12 moves." },
        ] },
      ] },
      { id: 'ma-tactics', title: 'Deeper tactics', icon: '⚔', lessons: [
        { id: 'ma-combo', title: 'Combinations', steps: [{ t: 'mined', theme: 'combination', count: 8, min: 1050, text: 'Find the combination.' }] },
        { id: 'ma-quiet', title: 'The quiet killer', steps: [
          { t: 'say', text: "The hardest moves to see aren't captures or checks. They're quiet moves that create a threat he can't meet." },
          { t: 'mined', theme: 'quiet', count: 5, text: 'Find the quiet move.' },
        ] },
        { id: 'ma-mate3', title: 'Mating attacks', steps: [{ t: 'mined', theme: 'mate3', count: 6, text: 'Mate in three.' }, { t: 'mined', theme: 'mate2', count: 4, min: 1150, text: 'Mate in two.' }] },
      ] },
      { id: 'ma-defence', title: 'Defence', icon: '🛡', lessons: [
        { id: 'ma-only', title: 'The only move', steps: [
          { t: 'say', text: "Good defenders look for the opponent's best reply to every candidate. Here, every natural move loses. One doesn't." },
          { t: 'mined', theme: 'defence', count: 8, min: 1100, text: 'Find the only defence.' },
        ] },
      ] },
    ],
  },
];
