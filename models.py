from sqlalchemy import Column, String, Integer, Numeric, Date, DateTime, ForeignKey, Enum as SQLEnum, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
import enum

Base = declarative_base()

# Enums
class VehicleStatus(enum.Enum):
    active = "active"
    repair = "repair"
    unavailable = "unavailable"
    rented = "rented"

class UserRole(enum.Enum):
    owner = "owner"
    admin = "admin"
    manager = "manager"
    team_lead = "team_lead"
    worker = "worker"

class PenaltyStatus(enum.Enum):
    open = "open"
    paid = "paid"

class MaintenanceType(enum.Enum):
    inspection = "inspection"
    repair = "repair"

class MaterialType(enum.Enum):
    material = "material"
    equipment = "equipment"

class MaterialStatus(enum.Enum):
    active = "active"
    returned = "returned"
    broken = "broken"

class ExpenseType(enum.Enum):
    vehicle = "vehicle"
    team = "team"

class MaterialEvent(enum.Enum):
    assigned = "assigned"
    returned = "returned"
    broken = "broken"

class WorkerCategory(enum.Enum):
    driver = "driver"
    mechanic = "mechanic"
    specialist = "specialist"
    general = "general"

# Models
class Team(Base):
    __tablename__ = "teams"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    organization = relationship("Organization")
    users = relationship("User", back_populates="team", foreign_keys="User.team_id")
    lead = relationship("User", foreign_keys=[lead_id])
    team_members = relationship("TeamMember", back_populates="team")
    vehicle_assignments = relationship("VehicleAssignment", back_populates="team")
    material_assignments = relationship("MaterialAssignment", back_populates="team")
    expenses = relationship("Expense", back_populates="team")

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String)
    role = Column(SQLEnum(UserRole), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    organization = relationship("Organization")
    team = relationship("Team", back_populates="users", foreign_keys=[team_id])
    penalties = relationship("Penalty", back_populates="user")

class TeamMember(Base):
    __tablename__ = "team_members"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String)
    category = Column(SQLEnum(WorkerCategory), default=WorkerCategory.general)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    organization = relationship("Organization")
    team = relationship("Team", back_populates="team_members")
    documents = relationship("TeamMemberDocument", back_populates="team_member")

class TeamMemberDocument(Base):
    __tablename__ = "team_member_documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_member_id = Column(UUID(as_uuid=True), ForeignKey("team_members.id"), nullable=False)
    title = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    expiry_date = Column(Date, nullable=True)
    upload_date = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    team_member = relationship("TeamMember", back_populates="documents")

class Vehicle(Base):
    __tablename__ = "vehicles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    license_plate = Column(String, unique=True)
    vin = Column(String, unique=True)
    status = Column(SQLEnum(VehicleStatus), default=VehicleStatus.active)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Rental-related fields
    is_rental = Column(Boolean, default=False)
    rental_start_date = Column(Date, nullable=True)
    rental_end_date = Column(Date, nullable=True)
    rental_monthly_price = Column(Numeric(10, 2), nullable=True)
    
    # Relationships
    vehicle_assignments = relationship("VehicleAssignment", back_populates="vehicle")
    penalties = relationship("Penalty", back_populates="vehicle")
    maintenances = relationship("Maintenance", back_populates="vehicle")
    expenses = relationship("Expense", back_populates="vehicle")
    rental_contracts = relationship("RentalContract", back_populates="vehicle")

class VehicleAssignment(Base):
    __tablename__ = "vehicle_assignments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    
    # Relationships
    vehicle = relationship("Vehicle", back_populates="vehicle_assignments")
    team = relationship("Team", back_populates="vehicle_assignments")

class Penalty(Base):
    __tablename__ = "penalties"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    date = Column(Date, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    photo_url = Column(String)
    status = Column(SQLEnum(PenaltyStatus), default=PenaltyStatus.open)
    
    # Relationships
    vehicle = relationship("Vehicle", back_populates="penalties")
    user = relationship("User", back_populates="penalties")

class Maintenance(Base):
    __tablename__ = "maintenances"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=False)
    date = Column(Date, nullable=False)
    type = Column(SQLEnum(MaintenanceType), nullable=False)
    description = Column(String)
    receipt_url = Column(String)
    
    # Relationships
    vehicle = relationship("Vehicle", back_populates="maintenances")

class Material(Base):
    __tablename__ = "materials"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    type = Column(SQLEnum(MaterialType), nullable=False)
    description = Column(String)
    
    # Relationships
    material_assignments = relationship("MaterialAssignment", back_populates="material")
    material_history = relationship("MaterialHistory", back_populates="material")

class MaterialAssignment(Base):
    __tablename__ = "material_assignments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    material_id = Column(UUID(as_uuid=True), ForeignKey("materials.id"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    status = Column(SQLEnum(MaterialStatus), default=MaterialStatus.active)
    
    # Relationships
    material = relationship("Material", back_populates="material_assignments")
    team = relationship("Team", back_populates="material_assignments")

class MaterialHistory(Base):
    __tablename__ = "material_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    material_id = Column(UUID(as_uuid=True), ForeignKey("materials.id"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    date = Column(Date, nullable=False)
    event = Column(SQLEnum(MaterialEvent), nullable=False)
    description = Column(String)
    
    # Relationships
    material = relationship("Material", back_populates="material_history")
    team = relationship("Team")

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    subscription_status = Column(String, default='active')
    subscription_expires_at = Column(DateTime)
    telegram_chat_id = Column(String, nullable=True)

class RentalContract(Base):
    __tablename__ = "rental_contracts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=False)
    contract_number = Column(String(100))
    rental_company_name = Column(String(255), nullable=False)
    rental_company_contact = Column(String(255))
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    monthly_price = Column(Numeric(10, 2), nullable=False)
    deposit_amount = Column(Numeric(10, 2))
    contract_file_url = Column(String)
    terms = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    vehicle = relationship("Vehicle", back_populates="rental_contracts")
    organization = relationship("Organization")

class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(SQLEnum(ExpenseType), nullable=False)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id"))
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"))
    date = Column(Date, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    description = Column(String)
    receipt_url = Column(String)
    
    # Relationships
    vehicle = relationship("Vehicle", back_populates="expenses")
    team = relationship("Team", back_populates="expenses")
