from models.user import UserPublic
from services.user_service import get_visible_users_for


async def visible_users(current_user: UserPublic):
    return await get_visible_users_for(current_user.role)
