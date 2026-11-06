from app.models import User
from app.schemas.user import CurrentUserResponse


def to_current_user_response(user: User) -> CurrentUserResponse:
    return CurrentUserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role.name,
        is_active=user.is_active,
        must_change_password=user.must_change_password,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
        permissions=sorted(
            permission.code for permission in user.role.permissions
        ),
    )
