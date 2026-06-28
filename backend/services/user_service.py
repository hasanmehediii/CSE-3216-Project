from database import get_database
from models.user import Role, VisibleUserColumn, VisibleUsersResponse
from services.auth_service import user_to_public

VISIBLE_ROLES: dict[Role, list[Role]] = {
    "student": ["teacher", "staff"],
    "teacher": ["student", "staff"],
    "staff": ["student", "teacher"],
}


async def get_visible_users_for(role: Role) -> VisibleUsersResponse:
    db = get_database()
    columns: list[VisibleUserColumn] = []

    for target_role in VISIBLE_ROLES[role]:
        documents = await db["users"].find({"role": target_role}).sort("name", 1).to_list(100)
        columns.append(
            VisibleUserColumn(
                role=target_role,
                title=f"Available {target_role.title()}s",
                users=[user_to_public(document) for document in documents],
            )
        )

    return VisibleUsersResponse(viewer_role=role, columns=columns)
