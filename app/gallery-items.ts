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
];
