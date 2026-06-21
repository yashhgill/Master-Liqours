"""Super Admin Staff Management — create, list, update, delete staff members."""
import secrets
import string
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from pydantic import BaseModel, EmailStr
from typing import Optional

from database import get_db
from models import Staff, User, Order, Product, Stock, UserRole, Warehouse
from auth_utils import get_current_user, hash_password, invalidate_other_sessions

router = APIRouter(prefix="/admin/staff", tags=["Admin · Staff"])


def _clean(s: Staff, warehouse_name: Optional[str] = None) -> dict:
    d = {k: v for k, v in s.__dict__.items() if not k.startswith('_')}
    d['warehouse_name'] = warehouse_name
    return d


async def _require_super(user: User):
    if user.role not in (UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN):
        raise HTTPException(status_code=403, detail="Admin only boss")


def _gen_password() -> str:
    return ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(10))


def _gen_referral(name: str) -> str:
    base = ''.join(c for c in name.upper() if c.isalpha())[:6] or 'STAFF'
    rand = ''.join(secrets.choice(string.digits) for _ in range(3))
    return f"{base}{rand}"


async def _get_or_create_warehouse(name: str, db: AsyncSession) -> Warehouse:
    """Staff sharing the same warehouse name automatically share one stock
    pool. Case-insensitive match on name so 'Main Store' and 'main store'
    resolve to the same warehouse."""
    clean_name = name.strip()
    r = await db.execute(select(Warehouse).where(Warehouse.name.ilike(clean_name)))
    wh = r.scalar_one_or_none()
    if wh:
        return wh
    wh = Warehouse(name=clean_name)
    db.add(wh)
    await db.flush()
    return wh


class StaffCreate(BaseModel):
    name: str
    email: EmailStr
    whatsapp_number: Optional[str] = None
    referral_code: Optional[str] = None
    warehouse_name: Optional[str] = None


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    whatsapp_number: Optional[str] = None
    referral_code: Optional[str] = None
    # Empty string clears the staff's warehouse (back to personal stock).
    # Omit the field entirely to leave it unchanged.
    warehouse_name: Optional[str] = None


@router.get("")
async def list_staff(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await _require_super(user)
    r = await db.execute(
        select(Staff, Warehouse.name).outerjoin(Warehouse, Staff.warehouse_id == Warehouse.warehouse_id)
        .order_by(Staff.created_at.desc())
    )
    return [_clean(s, wh_name) for s, wh_name in r.all()]


@router.post("", status_code=201)
async def create_staff(
    data: StaffCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_super(user)

    # Uniqueness checks
    existing = await db.execute(select(Staff).where(Staff.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Staff dengan email ni dah wujud")

    existing_user = await db.execute(select(User).where(User.email == data.email))
    if existing_user.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="User dengan email ni dah wujud")

    explicit = bool(data.referral_code)
    referral = (data.referral_code or _gen_referral(data.name)).upper()
    # Make sure referral code unique. If admin supplied explicit code -> 409 on clash.
    while True:
        r = await db.execute(select(Staff).where(Staff.referral_code == referral))
        if not r.scalar_one_or_none():
            break
        if explicit:
            raise HTTPException(status_code=409, detail="Referral code dah dipakai")
        referral = _gen_referral(data.name)

    warehouse_id = None
    if data.warehouse_name and data.warehouse_name.strip():
        warehouse = await _get_or_create_warehouse(data.warehouse_name, db)
        warehouse_id = warehouse.warehouse_id

    # Create staff record
    staff = Staff(
        name=data.name,
        email=data.email,
        referral_code=referral,
        whatsapp_number=data.whatsapp_number,
        warehouse_id=warehouse_id,
    )
    db.add(staff)

    # Create the linked User account (role=STAFF) with a generated password
    temp_password = _gen_password()
    staff_user = User(
        email=data.email,
        name=data.name,
        role=UserRole.STAFF,
        phone=data.whatsapp_number,
        password_hash=hash_password(temp_password),
    )
    db.add(staff_user)

    await db.commit()
    await db.refresh(staff)

    return {
        **_clean(staff, data.warehouse_name.strip() if data.warehouse_name else None),
        "temp_password": temp_password,  # Show ONCE — admin must share with staff
    }


@router.put("/{staff_id}")
async def update_staff(
    staff_id: str,
    data: StaffUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_super(user)
    r = await db.execute(select(Staff).where(Staff.staff_id == staff_id))
    staff = r.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff tak jumpa")

    raw_updates = data.model_dump(exclude_unset=True)
    has_warehouse_update = 'warehouse_name' in raw_updates
    warehouse_name = raw_updates.pop('warehouse_name', None)

    # Drop None values for the remaining plain columns (referral_code/name/whatsapp_number)
    updates = {k: v for k, v in raw_updates.items() if v is not None}

    if 'referral_code' in updates:
        updates['referral_code'] = updates['referral_code'].upper()
        # Check uniqueness
        clash = await db.execute(
            select(Staff).where(Staff.referral_code == updates['referral_code'], Staff.staff_id != staff_id)
        )
        if clash.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Referral code dah dipakai")

    for k, v in updates.items():
        setattr(staff, k, v)

    # Handle shared-warehouse assignment separately — empty string clears it,
    # a name gets/creates that warehouse, field omitted entirely = no change.
    if has_warehouse_update:
        if warehouse_name and warehouse_name.strip():
            warehouse = await _get_or_create_warehouse(warehouse_name, db)
            staff.warehouse_id = warehouse.warehouse_id
        else:
            staff.warehouse_id = None

    # Also sync name/phone to the linked user row
    if 'name' in updates or 'whatsapp_number' in updates:
        ur = await db.execute(select(User).where(User.email == staff.email))
        u = ur.scalar_one_or_none()
        if u:
            if 'name' in updates:
                u.name = updates['name']
            if 'whatsapp_number' in updates:
                u.phone = updates['whatsapp_number']

    await db.commit()
    await db.refresh(staff)

    wh_name = None
    if staff.warehouse_id:
        wh_r = await db.execute(select(Warehouse.name).where(Warehouse.warehouse_id == staff.warehouse_id))
        wh_name = wh_r.scalar_one_or_none()
    return _clean(staff, wh_name)


@router.post("/{staff_id}/reset-password")
async def reset_staff_password(
    staff_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Regenerate a temporary password for a staff member."""
    await _require_super(user)
    r = await db.execute(select(Staff).where(Staff.staff_id == staff_id))
    staff = r.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff tak jumpa")

    ur = await db.execute(select(User).where(User.email == staff.email))
    u = ur.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Staff user account tak jumpa")

    new_pw = _gen_password()
    u.password_hash = hash_password(new_pw)
    u.failed_login_attempts = 0
    u.locked_until = None
    await db.commit()
    # Boss reset this because of a lost/compromised password — kill any
    # session that staff member is already logged in with.
    await invalidate_other_sessions(db, u.user_id)
    return {"temp_password": new_pw}


@router.delete("/{staff_id}")
async def delete_staff(
    staff_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_super(user)
    r = await db.execute(select(Staff).where(Staff.staff_id == staff_id))
    staff = r.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff tak jumpa")

    # NULL out references on related tables (FK is ondelete=SET NULL but be explicit)
    await db.execute(update(Order).where(Order.staff_id == staff_id).values(staff_id=None))
    await db.execute(update(User).where(User.assigned_staff_id == staff_id).values(assigned_staff_id=None))
    await db.execute(update(Product).where(Product.staff_id == staff_id).values(staff_id=None))
    await db.execute(delete(Stock).where(Stock.staff_id == staff_id))

    # Delete the linked user account + the staff record
    email = staff.email
    await db.delete(staff)
    await db.execute(delete(User).where(User.email == email, User.role == UserRole.STAFF))
    await db.commit()

    return {"message": "Staff removed"}
