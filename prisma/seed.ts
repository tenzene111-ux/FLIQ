import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { videoThumbnail, coverArt, SAMPLE_VIDEO_URLS } from "../src/lib/placeholders";

const prisma = new PrismaClient();

// Deterministic PRNG so reseeding always produces the same numbers.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260101);
const randInt = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]) => arr[randInt(0, arr.length - 1)];
const daysAgo = (n: number, hOffset = 0) => new Date(Date.now() - n * 86400000 - hOffset * 3600000);

const PASSWORD = "Password123!";

// Order respects FK dependencies.
export async function clearDatabase() {
  await prisma.$transaction([
    prisma.report.deleteMany(),
    prisma.messageReaction.deleteMany(),
    prisma.message.deleteMany(),
    prisma.conversationParticipant.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.storyView.deleteMany(),
    prisma.story.deleteMany(),
    prisma.liveStream.deleteMany(),
    prisma.videoAnalytics.deleteMany(),
    prisma.creatorAnalytics.deleteMany(),
    prisma.videoView.deleteMany(),
    prisma.commentLike.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.save.deleteMany(),
    prisma.share.deleteMany(),
    prisma.repost.deleteMany(),
    prisma.like.deleteMany(),
    prisma.videoHashtag.deleteMany(),
    prisma.video.deleteMany(),
    prisma.sound.deleteMany(),
    prisma.hashtag.deleteMany(),
    prisma.blockedUser.deleteMany(),
    prisma.follow.deleteMany(),
    prisma.userSettings.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export async function seedDatabase() {
  console.log("Seeding Fliq demo data…");

  await clearDatabase();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // --------------------------------------------------------------- users
  const userSeeds = [
    {
      username: "jessica_07",
      email: "jessica@fliq.app",
      displayName: "Jessica",
      bio: "Dancer | Content Creator\nSpreading good vibes ✨",
      location: "Los Angeles, CA",
      isVerified: true,
      interests: ["dance", "lifestyle", "music"],
    },
    {
      username: "ava_miller",
      email: "ava@fliq.app",
      displayName: "Ava Miller",
      bio: "Chasing sunsets & good vibes 🌅 Travel creator",
      location: "Miami, FL",
      isVerified: true,
      interests: ["travel", "lifestyle", "fashion"],
    },
    {
      username: "liam_carter",
      email: "liam@fliq.app",
      displayName: "Liam Carter",
      bio: "Skater. Dreamer. Doer. 🛹",
      location: "Austin, TX",
      isVerified: false,
      interests: ["sports", "comedy"],
    },
    {
      username: "sophie_moore",
      email: "sophie@fliq.app",
      displayName: "Sophie Moore",
      bio: "Food, fashion & everything in between 💫",
      location: "New York, NY",
      isVerified: true,
      interests: ["fashion", "food", "lifestyle"],
    },
    {
      username: "noah_wilson",
      email: "noah@fliq.app",
      displayName: "Noah Wilson",
      bio: "Travel addict ✈️ 32 countries and counting",
      location: "Denver, CO",
      isVerified: false,
      interests: ["travel", "technology"],
    },
    {
      username: "olivia_brown",
      email: "olivia@fliq.app",
      displayName: "Olivia Brown",
      bio: "Comedy sketches & chaos 😂 New vid every week",
      location: "Chicago, IL",
      isVerified: false,
      interests: ["comedy", "lifestyle"],
    },
    {
      username: "mason_lee",
      email: "mason@fliq.app",
      displayName: "Mason Lee",
      bio: "Fitness coach 💪 Building better every day",
      location: "San Diego, CA",
      isVerified: false,
      interests: ["fitness", "sports"],
    },
    {
      username: "fliqteam",
      email: "team@fliq.app",
      displayName: "Fliq Team",
      bio: "Official Fliq account ✦ Welcome to the community!",
      location: "San Francisco, CA",
      isVerified: true,
      isAdmin: true,
      interests: ["technology", "education"],
    },
    {
      username: "alex_rivera",
      email: "demo@fliq.app",
      displayName: "Alex Rivera",
      bio: "Just here for good vibes 🎬 Trying out Fliq!",
      location: "Seattle, WA",
      isVerified: false,
      isAdmin: true,
      interests: ["art", "music", "gaming"],
    },
  ];

  const users: Record<string, Awaited<ReturnType<typeof prisma.user.create>>> = {};
  for (const u of userSeeds) {
    const created = await prisma.user.create({
      data: {
        username: u.username,
        email: u.email,
        passwordHash,
        displayName: u.displayName,
        bio: u.bio,
        location: u.location,
        isVerified: u.isVerified,
        isAdmin: u.isAdmin ?? false,
        emailVerified: true,
        interests: JSON.stringify(u.interests),
        settings: { create: {} },
      },
    });
    users[u.username] = created;
  }

  // ----------------------------------------------------------- hashtags
  const hashtagSeeds: [string, number][] = [
    ["fliqstar", 12_400_000],
    ["goodvibes", 8_700_000],
    ["dancemode", 6_100_000],
    ["traveldiaries", 5_400_000],
    ["fliqchallenge", 3_200_000],
    ["comedy", 4_100_000],
    ["foodie", 2_800_000],
    ["fitness", 2_100_000],
    ["ootd", 1_900_000],
    ["artdaily", 980_000],
    ["citylife", 1_500_000],
    ["skatelife", 760_000],
    ["nightvibes", 1_100_000],
    ["musicmonday", 1_300_000],
    ["gaming", 2_400_000],
    ["tech", 870_000],
    ["learnfliq", 410_000],
    ["fliq", 22_000_000],
  ];
  const hashtags: Record<string, Awaited<ReturnType<typeof prisma.hashtag.create>>> = {};
  for (const [tag, viewCount] of hashtagSeeds) {
    hashtags[tag] = await prisma.hashtag.create({ data: { tag, viewCount } });
  }

  // ------------------------------------------------------------- sounds
  const soundSeeds = [
    { title: "Heat Waves", artist: "Glass Animals", duration: 238, isOriginal: false, owner: null },
    { title: "Blinding Lights", artist: "The Weeknd", duration: 200, isOriginal: false, owner: null },
    { title: "As It Was", artist: "Harry Styles", duration: 167, isOriginal: false, owner: null },
    { title: "Flowers", artist: "Miley Cyrus", duration: 200, isOriginal: false, owner: null },
    { title: "Calm Down", artist: "Rema & Selena Gomez", duration: 239, isOriginal: false, owner: null },
    { title: "Cruel Summer", artist: "Taylor Swift", duration: 178, isOriginal: false, owner: null },
    { title: "Paint The Town Red", artist: "Doja Cat", duration: 231, isOriginal: false, owner: null },
    { title: "Unholy", artist: "Sam Smith & Kim Petras", duration: 156, isOriginal: false, owner: null },
    { title: "original sound", artist: "jessica_07", duration: 30, isOriginal: true, owner: "jessica_07" },
    { title: "original sound", artist: "liam_carter", duration: 24, isOriginal: true, owner: "liam_carter" },
  ];
  const sounds: Awaited<ReturnType<typeof prisma.sound.create>>[] = [];
  for (const s of soundSeeds) {
    const created = await prisma.sound.create({
      data: {
        title: s.title,
        artist: s.artist,
        duration: s.duration,
        isOriginal: s.isOriginal,
        ownerId: s.owner ? users[s.owner].id : null,
        coverUrl: coverArt(`${s.title}-${s.artist}`, s.title),
        audioUrl: `/audio/placeholder-${sounds.length + 1}.mp3`,
      },
    });
    sounds.push(created);
  }

  // ------------------------------------------------------------- videos
  interface VideoSeed {
    author: string;
    caption: string;
    tags: string[];
    soundIdx: number;
    day: number;
    hOffset?: number;
  }

  const videoSeeds: VideoSeed[] = [
    { author: "jessica_07", caption: "Dance like nobody's watching! 🔥", tags: ["fliq", "dance", "vibes"], soundIdx: 0, day: 0 },
    { author: "jessica_07", caption: "New routine dropping every Friday 💃 who's ready", tags: ["dancemode", "fliqstar"], soundIdx: 8, day: 3 },
    { author: "jessica_07", caption: "Rehearsal day. Sweat, repeat. #grind", tags: ["dancemode", "goodvibes"], soundIdx: 2, day: 7 },
    { author: "ava_miller", caption: "Golden hour in Santorini never disappoints ✨", tags: ["traveldiaries", "goodvibes"], soundIdx: 1, day: 1 },
    { author: "ava_miller", caption: "POV: you booked a one-way ticket ✈️", tags: ["traveldiaries", "fliqstar"], soundIdx: 4, day: 5 },
    { author: "ava_miller", caption: "Street food tour, episode 12 🍜", tags: ["foodie", "traveldiaries"], soundIdx: 6, day: 9 },
    { author: "liam_carter", caption: "Landed it on the 4th try, worth it 🛹", tags: ["skatelife", "fliqchallenge"], soundIdx: 9, day: 0, hOffset: 4 },
    { author: "liam_carter", caption: "Austin skate parks ranked 📋", tags: ["skatelife", "citylife"], soundIdx: 5, day: 4 },
    { author: "liam_carter", caption: "When the trick finally clicks 😮‍💨", tags: ["skatelife", "fliqstar"], soundIdx: 7, day: 11 },
    { author: "sophie_moore", caption: "Neon nights ✨ #fliq #nightvibes #neon", tags: ["nightvibes", "fliq"], soundIdx: 1, day: 0, hOffset: 2 },
    { author: "sophie_moore", caption: "Outfit breakdown for the fall drop 🍂", tags: ["ootd", "fashion"], soundIdx: 3, day: 2 },
    { author: "sophie_moore", caption: "5 minute pasta that tastes like 5 hours 🍝", tags: ["foodie", "goodvibes"], soundIdx: 6, day: 6 },
    { author: "sophie_moore", caption: "Get ready with me for NYFW 💄", tags: ["ootd", "fliqstar"], soundIdx: 2, day: 13 },
    { author: "noah_wilson", caption: "Country #32: Iceland did not disappoint 🇮🇸", tags: ["traveldiaries", "fliqchallenge"], soundIdx: 4, day: 2 },
    { author: "noah_wilson", caption: "Testing the newest AR glasses on the road 🕶️", tags: ["tech", "traveldiaries"], soundIdx: 5, day: 8 },
    { author: "noah_wilson", caption: "Packing my whole life into one bag 🎒", tags: ["traveldiaries", "goodvibes"], soundIdx: 0, day: 15 },
    { author: "olivia_brown", caption: "When your group chat has 47 unread messages 💀", tags: ["comedy", "goodvibes"], soundIdx: 3, day: 1 },
    { author: "olivia_brown", caption: "POV: explaining your job to your parents", tags: ["comedy", "fliqstar"], soundIdx: 7, day: 5 },
    { author: "olivia_brown", caption: "Sketch: the group project™", tags: ["comedy"], soundIdx: 2, day: 10 },
    { author: "mason_lee", caption: "20 min full body — no equipment needed 💪", tags: ["fitness", "goodvibes"], soundIdx: 4, day: 3 },
    { author: "mason_lee", caption: "Form check: are you squatting right?", tags: ["fitness", "learnfliq"], soundIdx: 5, day: 7 },
    { author: "mason_lee", caption: "Day 1 vs day 90 of showing up 📈", tags: ["fitness", "fliqchallenge"], soundIdx: 0, day: 14 },
    { author: "fliqteam", caption: "Welcome to Fliq! Here's how to get started 🎬", tags: ["fliq", "learnfliq"], soundIdx: 8, day: 20 },
    { author: "fliqteam", caption: "#FliqStar challenge is live — join now!", tags: ["fliqstar", "fliqchallenge"], soundIdx: 1, day: 4 },
    { author: "alex_rivera", caption: "First post on Fliq, be nice 😅", tags: ["fliq", "goodvibes"], soundIdx: 9, day: 6 },
    { author: "alex_rivera", caption: "Speedrun any% attempt #4 🎮", tags: ["gaming", "fliqchallenge"], soundIdx: 5, day: 12 },
    { author: "alex_rivera", caption: "Late night sketch session 🎨", tags: ["artdaily", "nightvibes"], soundIdx: 2, day: 17 },
    { author: "noah_wilson", caption: "City lights hit different at 2am 🌃", tags: ["citylife", "nightvibes"], soundIdx: 6, day: 18 },
  ];

  let vidCounter = 0;
  for (const seed of videoSeeds) {
    const author = users[seed.author];
    const views = randInt(40_000, 2_400_000);
    const likeRatio = rng() * 0.08 + 0.02;
    const likes = Math.round(views * likeRatio);
    const comments = Math.round(likes * (rng() * 0.06 + 0.01));
    const shares = Math.round(likes * (rng() * 0.1 + 0.02));
    const saves = Math.round(likes * (rng() * 0.08 + 0.02));
    const thumbSeed = `${seed.author}-${vidCounter}`;

    await prisma.video.create({
      data: {
        userId: author.id,
        caption: seed.caption,
        videoUrl: SAMPLE_VIDEO_URLS[vidCounter % SAMPLE_VIDEO_URLS.length],
        thumbnailUrl: videoThumbnail(thumbSeed, seed.tags[0] ?? seed.author),
        duration: randInt(12, 58),
        location: rng() > 0.6 ? author.location : null,
        soundId: sounds[seed.soundIdx].id,
        createdAt: daysAgo(seed.day, seed.hOffset ?? 0),
        hashtags: {
          create: seed.tags
            .filter((t) => hashtags[t])
            .map((t) => ({ hashtagId: hashtags[t].id })),
        },
        analytics: {
          create: {
            views,
            likes,
            comments,
            shares,
            saves,
            avgWatchSeconds: randInt(4, 40),
            completionRate: rng() * 0.5 + 0.35,
          },
        },
      },
    });
    vidCounter++;
  }

  const allVideos = await prisma.video.findMany({ orderBy: { createdAt: "desc" } });

  // ----------------------------------------------------------- follows
  const usernames = Object.keys(users);
  const followPairs: [string, string][] = [
    ["alex_rivera", "jessica_07"],
    ["alex_rivera", "ava_miller"],
    ["alex_rivera", "sophie_moore"],
    ["alex_rivera", "fliqteam"],
    ["jessica_07", "alex_rivera"],
    ["noah_wilson", "alex_rivera"],
    ["olivia_brown", "alex_rivera"],
    ["mason_lee", "alex_rivera"],
    ["jessica_07", "ava_miller"],
    ["jessica_07", "sophie_moore"],
    ["ava_miller", "jessica_07"],
    ["ava_miller", "noah_wilson"],
    ["liam_carter", "mason_lee"],
    ["sophie_moore", "jessica_07"],
    ["sophie_moore", "ava_miller"],
    ["noah_wilson", "ava_miller"],
    ["olivia_brown", "sophie_moore"],
    ["mason_lee", "liam_carter"],
    ["fliqteam", "jessica_07"],
  ];
  for (const [follower, following] of followPairs) {
    await prisma.follow.create({ data: { followerId: users[follower].id, followingId: users[following].id } });
  }

  // -------------------------------------------------- creator analytics
  for (const uname of usernames) {
    const user = users[uname];
    const followerBoostByUser: Record<string, number> = {
      jessica_07: 344_800,
      ava_miller: 512_000,
      liam_carter: 88_200,
      sophie_moore: 276_500,
      noah_wilson: 143_900,
      olivia_brown: 201_300,
      mason_lee: 96_700,
      fliqteam: 1_240_000,
      alex_rivera: 640,
    };
    const likeBoostByUser: Record<string, number> = {
      jessica_07: 8_650_000,
      ava_miller: 12_100_000,
      liam_carter: 1_940_000,
      sophie_moore: 6_300_000,
      noah_wilson: 2_870_000,
      olivia_brown: 4_450_000,
      mason_lee: 1_620_000,
      fliqteam: 3_100_000,
      alex_rivera: 210,
    };
    await prisma.creatorAnalytics.create({
      data: {
        userId: user.id,
        totalViews: randInt(200_000, 4_000_000),
        totalWatchTime: randInt(50_000, 900_000),
        totalLikes: likeBoostByUser[uname] ?? 0,
        totalComments: randInt(1_000, 60_000),
        totalShares: randInt(500, 40_000),
        totalSaves: randInt(500, 30_000),
        followerBoost: followerBoostByUser[uname] ?? 0,
      },
    });
  }

  // ------------------------------------------------------------ comments
  const commentPool = [
    "This is amazing! 🔥🔥",
    "Okay I need the tutorial for this",
    "Living for this energy",
    "The algorithm blessed me today",
    "Not me watching this 5 times in a row",
    "Underrated creator fr",
    "Take my follow 🙌",
    "This lives in my head rent free",
    "Who else came from the FliqStar challenge?",
    "The transition though 😭",
    "Saving this for later",
    "Wait this is actually so good",
    "Do a part 2!!",
    "Sound is a certified banger",
    "First!",
  ];
  for (const video of allVideos.slice(0, 20)) {
    const numComments = randInt(2, 6);
    for (let i = 0; i < numComments; i++) {
      const commenter = users[pick(usernames)];
      const comment = await prisma.comment.create({
        data: {
          videoId: video.id,
          userId: commenter.id,
          text: pick(commentPool),
          isPinned: i === 0 && rng() > 0.7,
          createdAt: daysAgo(randInt(0, 3)),
        },
      });
      if (rng() > 0.5) {
        await prisma.comment.create({
          data: {
            videoId: video.id,
            userId: users[pick(usernames)].id,
            parentId: comment.id,
            text: pick(["Literally!!", "So true", "😂😂😂", "Facts", "Agreed 100%"]),
            createdAt: daysAgo(randInt(0, 2)),
          },
        });
      }
    }
  }

  // ---------------------------------------------- likes / saves / views
  for (const video of allVideos) {
    for (const uname of usernames) {
      if (uname === "fliqteam") continue;
      const roll = rng();
      if (roll > 0.55) {
        await prisma.like.create({ data: { userId: users[uname].id, videoId: video.id } }).catch(() => {});
      }
      if (roll > 0.85) {
        await prisma.save.create({ data: { userId: users[uname].id, videoId: video.id } }).catch(() => {});
      }
      await prisma.videoView
        .create({
          data: {
            userId: users[uname].id,
            videoId: video.id,
            watchSeconds: randInt(2, video.duration),
            completed: rng() > 0.5,
          },
        })
        .catch(() => {});
    }
  }

  // Reposts
  await prisma.repost.create({ data: { userId: users["alex_rivera"].id, videoId: allVideos[3].id } });
  await prisma.repost.create({ data: { userId: users["jessica_07"].id, videoId: allVideos[10].id } });

  // ------------------------------------------------------------ stories
  const storyUsers = ["jessica_07", "ava_miller", "liam_carter", "sophie_moore", "noah_wilson"];
  for (const uname of storyUsers) {
    await prisma.story.create({
      data: {
        userId: users[uname].id,
        mediaUrl: SAMPLE_VIDEO_URLS[randInt(0, SAMPLE_VIDEO_URLS.length - 1)],
        mediaType: "video",
        text: pick(["Good morning ☀️", "On set today 🎬", "New drop soon 👀", null, "Vibes only ✨"]) ?? undefined,
        createdAt: daysAgo(0, randInt(1, 20)),
        expiresAt: new Date(Date.now() + 20 * 3600000),
      },
    });
  }

  // -------------------------------------------------------- conversations
  const dmSeeds: { other: string; messages: { from: string; text: string; minsAgo: number }[] }[] = [
    {
      other: "ava_miller",
      messages: [
        { from: "ava_miller", text: "Loved your video!", minsAgo: 2 },
        { from: "alex_rivera", text: "Thank you so much! 🥹", minsAgo: 1 },
      ],
    },
    {
      other: "liam_carter",
      messages: [
        { from: "liam_carter", text: "Your video is amazing!", minsAgo: 10 },
        { from: "alex_rivera", text: "means a lot coming from you!", minsAgo: 8 },
        { from: "liam_carter", text: "we should collab sometime", minsAgo: 7 },
      ],
    },
    {
      other: "fliqteam",
      messages: [{ from: "fliqteam", text: "Welcome to Fliq! 🎉 Let us know if you need anything.", minsAgo: 60 }],
    },
    {
      other: "sophie_moore",
      messages: [{ from: "sophie_moore", text: "🔥🔥🔥", minsAgo: 130 }],
    },
    {
      other: "noah_wilson",
      messages: [{ from: "noah_wilson", text: "Hey, just followed you — love your content!", minsAgo: 180 }],
    },
  ];

  const me = users["alex_rivera"];
  for (const dm of dmSeeds) {
    const other = users[dm.other];
    const convo = await prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId: me.id }, { userId: other.id }],
        },
      },
    });
    for (const m of dm.messages) {
      await prisma.message.create({
        data: {
          conversationId: convo.id,
          senderId: users[m.from].id,
          text: m.text,
          createdAt: new Date(Date.now() - m.minsAgo * 60000),
        },
      });
    }
  }

  // A pending message request
  const requester = users["mason_lee"];
  const reqConvo = await prisma.conversation.create({
    data: {
      participants: {
        create: [
          { userId: me.id, isRequest: true },
          { userId: requester.id },
        ],
      },
    },
  });
  await prisma.message.create({
    data: { conversationId: reqConvo.id, senderId: requester.id, text: "Hey! Big fan of your posts, would love to connect 🙌" },
  });

  // --------------------------------------------------------- notifications
  const notifSeeds: { actor: string; type: string; minsAgo: number; videoIdx?: number; commentText?: string }[] = [
    { actor: "ava_miller", type: "like", minsAgo: 2, videoIdx: 23 },
    { actor: "liam_carter", type: "comment", minsAgo: 5, videoIdx: 23, commentText: "Amazing! 🔥" },
    { actor: "sophie_moore", type: "follow", minsAgo: 10 },
    { actor: "noah_wilson", type: "share", minsAgo: 15, videoIdx: 24 },
    { actor: "olivia_brown", type: "mention", minsAgo: 20, videoIdx: 24 },
    { actor: "jessica_07", type: "like", minsAgo: 60, videoIdx: 25 },
    { actor: "mason_lee", type: "follow", minsAgo: 120 },
    { actor: "fliqteam", type: "system", minsAgo: 1440 },
  ];
  const myVideos = allVideos.filter((v) => v.userId === me.id);
  for (const n of notifSeeds) {
    await prisma.notification.create({
      data: {
        recipientId: me.id,
        actorId: n.actor ? users[n.actor].id : null,
        type: n.type,
        videoId: n.videoIdx !== undefined ? myVideos[n.videoIdx % Math.max(myVideos.length, 1)]?.id : null,
        commentText: n.commentText,
        createdAt: new Date(Date.now() - n.minsAgo * 60000),
        isRead: n.minsAgo > 100,
      },
    });
  }

  console.log(`Seed complete: ${usernames.length} users, ${allVideos.length} videos.`);
  console.log(`Demo login → email: demo@fliq.app  password: ${PASSWORD}`);
}

import { fileURLToPath } from "url";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
