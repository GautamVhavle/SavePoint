import { parseArgs } from 'node:util';
import { PrismaPg } from '@prisma/adapter-pg';
import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '../api/_lib/generated/prisma/client.js';

loadEnv({ path: ['.env.local', '.env'], quiet: true });

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

async function seed(auth0Sub: string, handle: string): Promise<void> {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not configured');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    if (await prisma.profile.findUnique({ where: { handle } })) {
      console.log(`Profile @${handle} already exists; no changes made.`);
      return;
    }

    await prisma.$transaction(async tx => {
      const profile = await tx.profile.create({
        data: {
          auth0Sub,
          handle,
          displayName: 'Alex SavePoint',
          bio: 'Completionist, indie explorer, and unapologetic photo-mode tourist.',
          location: 'Toronto, Canada',
          socialLinks: { twitch: 'https://twitch.tv/savepoint_demo' },
          isPublic: true,
        },
      });

      await tx.rig.create({
        data: {
          profileId: profile.id,
          name: 'The Respawn Station',
          monitors: [
            {
              display_name: 'Alienware AW3423DWF',
              brand_model: 'QD-OLED ultrawide',
              size_inches: 34,
              resolution: '3440x1440',
              refresh_hz: 165,
            },
          ],
          cpu: 'AMD Ryzen 7 7800X3D',
          gpu: 'NVIDIA GeForce RTX 4080 Super',
          motherboard: 'ASUS ROG Strix B650E-F',
          memory: '32 GB DDR5-6000',
          storage: '2 TB NVMe Gen4 SSD',
          case: 'Fractal North',
          psu: '850 W 80+ Gold',
          cooling: '360 mm AIO',
          os: 'Windows 11 Pro',
        },
      });

      await tx.peripheral.createMany({
        data: [
          {
            profileId: profile.id,
            type: 'keyboard',
            displayName: 'Keychron Q1 Pro',
            brandModel: 'QMK/VIA · banana switches',
            sortOrder: 0,
          },
          {
            profileId: profile.id,
            type: 'controller',
            displayName: 'DualSense Wireless Controller',
            brandModel: 'Sony · edge triggers',
            sortOrder: 1,
          },
          {
            profileId: profile.id,
            type: 'audio',
            displayName: 'HD 599 open-back headphones',
            brandModel: 'Sennheiser',
            sortOrder: 2,
          },
        ],
      });

      const gameFields = {
        name: 'Elden Ring',
        slug: 'elden-ring',
        summary: 'An action RPG set in the Lands Between.',
        bannerUrl:
          'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg',
        genres: ['Role-playing (RPG)', 'Adventure'],
        platforms: ['PC (Microsoft Windows)', 'PlayStation 5', 'Xbox Series X|S'],
        snapshot: { id: 119133, name: 'Elden Ring', source: 'IGDB demo snapshot' },
      };
      const game = await tx.game.upsert({
        where: { igdbId: 119133 },
        create: { igdbId: 119133, ...gameFields },
        update: gameFields,
      });

      const entry = await tx.profileGame.create({
        data: {
          profileId: profile.id,
          gameId: game.id,
          status: 'completed',
          rating: 4.5,
          review: 'A vast, surprising journey whose world rewards curiosity.',
          hoursPlayed: 142.5,
          startedOn: day('2024-01-12'),
          completedOn: day('2024-03-30'),
          platform: 'PC',
          featured: true,
          featuredOrder: 0,
          featuredNote: 'My benchmark for open-world exploration.',
        },
      });

      await tx.award.create({
        data: {
          profileId: profile.id,
          profileGameId: entry.id,
          title: 'Golden Save',
          description: 'Favorite world to get lost in this year',
          awardedOn: day('2024-03-30'),
          sortOrder: 0,
        },
      });
    });

    console.log(`Created demo profile @${handle} for ${auth0Sub}.`);
  } finally {
    await prisma.$disconnect();
  }
}

const { values } = parseArgs({
  options: {
    'auth0-sub': { type: 'string', default: 'auth0|demo-savepoint-user' },
    handle: { type: 'string', default: 'alex' },
  },
});

await seed(values['auth0-sub']!.toLowerCase(), values.handle!.toLowerCase());
