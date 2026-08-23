import argparse
import asyncio
from datetime import date

from sqlalchemy import select

from app.db import SessionLocal
from app.models import (
    Award,
    Game,
    GameStatus,
    Peripheral,
    Profile,
    ProfileGame,
    Rig,
)


async def seed(auth0_sub: str, handle: str) -> None:
    async with SessionLocal() as session:
        if await session.scalar(select(Profile).where(Profile.handle == handle)):
            print(f"Profile @{handle} already exists; no changes made.")
            return
        profile = Profile(
            auth0_sub=auth0_sub,
            handle=handle,
            display_name="Alex SavePoint",
            bio="Completionist, indie explorer, and unapologetic photo-mode tourist.",
            location="Toronto, Canada",
            social_links={"twitch": "https://twitch.tv/savepoint_demo"},
            is_public=True,
        )
        session.add(profile)
        await session.flush()
        session.add(
            Rig(
                profile_id=profile.id,
                name="The Respawn Station",
                hero_photo_url=None,
                monitors=[
                    {
                        "display_name": "Alienware AW3423DWF",
                        "brand_model": "QD-OLED ultrawide",
                        "size_inches": 34,
                        "resolution": "3440x1440",
                        "refresh_hz": 165,
                    }
                ],
                cpu="AMD Ryzen 7 7800X3D",
                gpu="NVIDIA GeForce RTX 4080 Super",
                motherboard="ASUS ROG Strix B650E-F",
                memory="32 GB DDR5-6000",
                storage="2 TB NVMe Gen4 SSD",
                case="Fractal North",
                psu="850 W 80+ Gold",
                cooling="360 mm AIO",
                os="Windows 11 Pro",
            )
        )
        session.add_all(
            [
                Peripheral(
                    profile_id=profile.id,
                    type="keyboard",
                    display_name="Keychron Q1 Pro",
                    brand_model="QMK/VIA · banana switches",
                    sort_order=0,
                ),
                Peripheral(
                    profile_id=profile.id,
                    type="controller",
                    display_name="DualSense Wireless Controller",
                    brand_model="Sony · edge triggers",
                    sort_order=1,
                ),
                Peripheral(
                    profile_id=profile.id,
                    type="audio",
                    display_name="HD 599 open-back headphones",
                    brand_model="Sennheiser",
                    sort_order=2,
                ),
            ]
        )
        game = Game(
            igdb_id=119133,
            name="Elden Ring",
            slug="elden-ring",
            summary="An action RPG set in the Lands Between.",
            cover_url="https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg",
            genres=["Role-playing (RPG)", "Adventure"],
            platforms=["PC (Microsoft Windows)", "PlayStation 5", "Xbox Series X|S"],
            snapshot={"id": 119133, "name": "Elden Ring", "source": "IGDB demo snapshot"},
        )
        session.add(game)
        await session.flush()
        entry = ProfileGame(
            profile_id=profile.id,
            game_id=game.id,
            status=GameStatus.completed,
            rating=4.5,
            review="A vast, surprising journey whose world rewards curiosity.",
            hours_played=142.5,
            started_on=date(2024, 1, 12),
            completed_on=date(2024, 3, 30),
            platform="PC",
            featured=True,
            featured_order=0,
            featured_note="My benchmark for open-world exploration.",
        )
        session.add(entry)
        await session.flush()
        session.add(
            Award(
                profile_id=profile.id,
                profile_game_id=entry.id,
                title="Golden Save",
                description="Favorite world to get lost in this year",
                awarded_on=date(2024, 3, 30),
                sort_order=0,
            )
        )
        await session.commit()
        print(f"Created demo profile @{handle} for {auth0_sub}.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed a realistic SavePoint demo portfolio")
    parser.add_argument("--auth0-sub", default="auth0|demo-savepoint-user")
    parser.add_argument("--handle", default="alex")
    args = parser.parse_args()
    asyncio.run(seed(args.auth0_sub.lower(), args.handle.lower()))


if __name__ == "__main__":
    main()
