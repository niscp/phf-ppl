export type GalleryCategory = "Matchday" | "Teams" | "Awards";
export type GalleryItem = {
  id: string;
  type: "image";
  src: string;
  title: string;
  caption: string;
  category: GalleryCategory;
  alt: string;
};

// Keep items in source upload order. Add one entry for each new, non-duplicate asset.
// The supplied photos do not contain EXIF capture timestamps, so their exact shot time
// cannot be reconstructed from these uploads.
export const galleryItems: GalleryItem[] = [
  { id: "arrival", type: "image", src: "arrival-walk.jpg", title: "The walk in", caption: "A quiet moment before the noise", category: "Matchday", alt: "Prestige Super Giants batter walking in from the boundary with his bat" },
  { id: "jersey", type: "image", src: "jersey-portrait.jpg", title: "Game face", caption: "Prestige Super Giants, matchday ready", category: "Teams", alt: "Prestige Super Giants player in his team jersey" },
  { id: "back-of-shirt", type: "image", src: "name-on-the-back.jpg", title: "Name on the back", caption: "Sohan · number 18", category: "Teams", alt: "Back of Sohan's Prestige Super Giants jersey, number 18" },
  { id: "wide-ground", type: "image", src: "matchday-wide.jpg", title: "First ball, somewhere out there", caption: "The ground comes alive", category: "Matchday", alt: "Players set in the field during a PHF Premier League match" },
  { id: "cap-ceremony", type: "image", src: "first-cap.jpg", title: "A cap, a moment", caption: "A High Flyers player receives his first cap", category: "Teams", alt: "High Flyers teammate placing a purple team cap on a player's head" },
  { id: "man-of-match", type: "image", src: "man-of-match-board.jpg", title: "Player of the match", caption: "A performance worth celebrating", category: "Awards", alt: "PHF Premier League player of the match presentation board" },
  { id: "prize", type: "image", src: "prize-presentation.jpg", title: "A winning hand", caption: "The matchday prize presentation", category: "Awards", alt: "Tournament prize being presented to a player" },
  { id: "rivals", type: "image", src: "rivals-together.jpg", title: "Rivals on the pitch. Teammates off it.", caption: "Amigos meet Avengers", category: "Teams", alt: "PHF Amigos and Avengers players together at the ground" },
  { id: "coupon", type: "image", src: "coupon-handoff.jpg", title: "A little extra celebration", caption: "A matchday voucher handoff", category: "Awards", alt: "PHF matchday prize voucher being handed to a player" },
  { id: "prestige-team", type: "image", src: "prestige-team.jpg", title: "The Super Giants", caption: "Prestige Super Giants, shoulder to shoulder", category: "Teams", alt: "Prestige Super Giants squad lined up on the field" },
  { id: "care", type: "image", src: "sideline-support.jpg", title: "Look after your own", caption: "A teammate checks in between overs", category: "Matchday", alt: "Players and staff helping a teammate on the sideline" },
  { id: "batting", type: "image", src: "batting-action.jpg", title: "Into the shot", caption: "A batter takes on the delivery", category: "Matchday", alt: "Batter playing a shot during a PHF Premier League match" },
  { id: "kings-squad", type: "image", src: "super-kings-team.jpg", title: "Super Kings at sunset", caption: "A squad, one last frame", category: "Teams", alt: "PHF Super Kings squad lined up together at sunset" },
  { id: "avengers-award", type: "image", src: "avengers-award.jpg", title: "A moment with the organizers", caption: "PHF Super Kings representative at the presentation", category: "Teams", alt: "PHF Super Kings player posing with a tournament organizer" },
  { id: "captains-organizer", type: "image", src: "captains-with-organizer.jpg", title: "The people who make it happen", caption: "Team representatives with a tournament organizer", category: "Teams", alt: "Prestige Super Giants and Super Kings representatives with an organizer" },
  { id: "pitch", type: "image", src: "pitch-wide.jpg", title: "Before the first ball", caption: "A fresh pitch and a full day ahead", category: "Matchday", alt: "The cricket pitch and stumps before play" },
  { id: "ball-at-sunset", type: "image", src: "sunset-cricket-ball.jpg", title: "Last light", caption: "One ball, one more story", category: "Matchday", alt: "A white cricket ball held up against the setting sun" },
  { id: "portrait-together", type: "image", src: "super-kings-portrait.jpg", title: "A handshake before the game", caption: "PHF Super Kings and High Flyers", category: "Teams", alt: "A PHF Super Kings player and a High Flyers player posing together" },
  { id: "blasterz-kings-pose", type: "image", src: "blasterz-kings-pose.jpg", title: "Teams meet at the boundary", caption: "PHF Blasterz and Super Kings", category: "Teams", alt: "PHF Blasterz and Super Kings players posing together at the ground" },
  { id: "organizer-blue-players", type: "image", src: "organizer-blue-players.jpg", title: "A quick team talk", caption: "A tournament organizer speaks with the players", category: "Matchday", alt: "Tournament organizer talking with blue-shirted players beside the cricket field" },
  { id: "high-flyers-jerseys", type: "image", src: "high-flyers-jerseys.jpg", title: "Names on the back", caption: "High Flyers head out to the field", category: "Teams", alt: "Two High Flyers players walking onto the field, jerseys marked Mayank and AJ" },
  { id: "amigos-boundary", type: "image", src: "amigos-boundary.jpg", title: "A moment by the boundary", caption: "PHF Amigos catch up between play", category: "Teams", alt: "PHF Amigos players greeting each other near the boundary" },
  { id: "amigos-huddle", type: "image", src: "amigos-huddle.jpg", title: "Circle up", caption: "A huddle on the sideline", category: "Teams", alt: "PHF Amigos players and an organizer gathered in a sideline huddle" },
  { id: "amigos-team-chat", type: "image", src: "amigos-team-chat.jpg", title: "Between overs", caption: "A conversation with the Amigos", category: "Matchday", alt: "PHF Amigos players talking together beside the field" },
  { id: "amigos-child", type: "image", src: "amigos-child.jpg", title: "A little fan in the team colors", caption: "PHF Amigos pride at every age", category: "Teams", alt: "Young PHF Amigos fan pointing at the camera in his team jersey" },
  { id: "high-flyers-chandan", type: "image", src: "high-flyers-chandan.jpg", title: "Chandan · number 26", caption: "High Flyers, from the back", category: "Teams", alt: "High Flyers player Chandan wearing jersey number 26" },
  { id: "amigos-high-flyers", type: "image", src: "amigos-high-flyers.jpg", title: "Good game, good company", caption: "PHF Amigos and High Flyers together", category: "Teams", alt: "PHF Amigos and High Flyers players posing together on the field" },
  { id: "avengers-team", type: "image", src: "avengers-team.jpg", title: "Avengers, together", caption: "A team photo on the field", category: "Teams", alt: "PHF Avengers squad in yellow jerseys posing together" },
  { id: "avengers-pair", type: "image", src: "avengers-pair.jpg", title: "Two Avengers", caption: "A quick photo after the match", category: "Teams", alt: "Two PHF Avengers players posing together on the field" },
  { id: "kings-organizer", type: "image", src: "kings-organizer.jpg", title: "A Super Kings keepsake", caption: "A player and tournament organizer share a moment", category: "Teams", alt: "PHF Super Kings player posing with a tournament organizer" },
  { id: "avengers-motm", type: "image", src: "avengers-motm.jpg", title: "Player of the match", caption: "An Avengers player receives the matchday award", category: "Awards", alt: "PHF Avengers player receiving a player of the match presentation with a Super Kings representative" },
  { id: "avengers-hat-ceremony", type: "image", src: "avengers-hat-ceremony.jpg", title: "The winning hat", caption: "A playful moment at the awards", category: "Awards", alt: "PHF Super Kings representative placing a yellow hat on an Avengers player" },
  { id: "teams-leave-pitch", type: "image", src: "teams-leave-pitch.jpg", title: "The match is done", caption: "Players leave the field together", category: "Matchday", alt: "PHF Avengers and Super Kings players walking off the cricket field" },
  { id: "avengers-walk-in", type: "image", src: "avengers-walk-in.jpg", title: "The Avengers walk in", caption: "A team makes its way in from the pavilion", category: "Matchday", alt: "PHF Avengers players walking toward the pavilion from the field" },
  { id: "avengers-delivery", type: "image", src: "avengers-delivery.jpg", title: "At the crease", caption: "An Avengers bowler delivers to a Super Kings batter", category: "Matchday", alt: "PHF Avengers bowler delivering the ball to a PHF Super Kings batter" },
  { id: "avengers-huddle", type: "image", src: "avengers-huddle.jpg", title: "Avengers huddle", caption: "A team gathers between overs", category: "Teams", alt: "PHF Avengers players in a team huddle beneath the trees" },
  { id: "avengers-batter-return", type: "image", src: "avengers-batter-return.jpg", title: "Back from the middle", caption: "An Avengers batter returns with his kit", category: "Matchday", alt: "PHF Avengers batter walking back from the pitch with his bat and gloves" },
  { id: "avengers-batting-shot", type: "image", src: "avengers-batting-shot.jpg", title: "Making contact", caption: "An Avengers batter plays through the ball", category: "Matchday", alt: "PHF Avengers batter playing a shot during the match" },
  { id: "players-walk-to-field", type: "image", src: "players-walk-to-field.jpg", title: "Back out there", caption: "Players walk onto the field together", category: "Matchday", alt: "Three players walking toward the field in their PHF Avengers jerseys" },
  { id: "umpire-at-pitch", type: "image", src: "umpire-at-pitch.jpg", title: "Ready for the next ball", caption: "The umpire takes position by the stumps", category: "Matchday", alt: "Cricket umpire standing beside the stumps on the pitch" },
  { id: "kings-player-portrait", type: "image", src: "kings-player-portrait.jpg", title: "Super Kings on the field", caption: "A player takes a breather between overs", category: "Teams", alt: "PHF Super Kings player in his blue team jersey on the field" },
  { id: "prestige-handshake", type: "image", src: "prestige-handshake.jpg", title: "A Prestige handshake", caption: "A Super Giants player celebrates with a guest", category: "Teams", alt: "Prestige Super Giants player shaking hands with a guest at the ground" },
  { id: "blasterz-prize-presentation", type: "image", src: "blasterz-prize-presentation.jpg", title: "A prize for the Blasterz", caption: "A matchday award presentation", category: "Awards", alt: "PHF Blasterz player receiving a prize beside the PHF Premier League presentation board" },
  { id: "prestige-blasterz-board", type: "image", src: "prestige-blasterz-board.jpg", title: "The award board", caption: "PHF Blasterz and Prestige Super Giants at the presentation", category: "Awards", alt: "PHF Blasterz and Prestige Super Giants players holding the matchday award board" },
  { id: "blasterz-trophy-team", type: "image", src: "blasterz-trophy-team.jpg", title: "A trophy for the Blasterz", caption: "Teammates celebrate the award", category: "Awards", alt: "Two PHF Blasterz teammates posing with a trophy" },
  { id: "blasterz-trophy-award", type: "image", src: "blasterz-trophy-award.jpg", title: "A trophy moment", caption: "A Blasterz player receives his award", category: "Awards", alt: "PHF Blasterz player receiving a trophy from his teammate" },
  { id: "blasterz-dressing-room", type: "image", src: "blasterz-dressing-room.jpg", title: "Pride in the pavilion", caption: "A trophy and kit after the match", category: "Awards", alt: "PHF Blasterz players in the pavilion with a trophy and cricket gear" },
  { id: "blasterz-sunset-chat", type: "image", src: "blasterz-sunset-chat.jpg", title: "After the final whistle", caption: "Blasterz share a moment at sunset", category: "Teams", alt: "PHF Blasterz player talking with a guest at sunset" },
  { id: "sunset-handshake", type: "image", src: "sunset-handshake.jpg", title: "A handshake at last light", caption: "Respect between teams as the day winds down", category: "Teams", alt: "Prestige Super Giants and PHF Blasterz players shaking hands at sunset" },
  { id: "sunset-ground-wide", type: "image", src: "sunset-ground-wide.jpg", title: "Golden hour at the ground", caption: "The last light settles over the pitch", category: "Matchday", alt: "Wide view of the cricket ground at sunset" },
  { id: "sunset-ground-view", type: "image", src: "sunset-ground-view.jpg", title: "One last look", caption: "A quiet evening over the field", category: "Matchday", alt: "The cricket field and pitch under the setting sun" },
];
