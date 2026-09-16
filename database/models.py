from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # 'farmer' or 'buyer'
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    farms = relationship("Farm", back_populates="farmer", cascade="all, delete-orphan")
    buyer_profile = relationship("Buyer", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Farm(Base):
    __tablename__ = "farms"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    farm_name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    area = Column(Float, nullable=False)  # in hectares
    district = Column(String, nullable=False)
    state = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    farmer = relationship("User", back_populates="farms")
    farm_crops = relationship("FarmCrop", back_populates="farm", cascade="all, delete-orphan")
    yield_predictions = relationship("YieldPrediction", back_populates="farm", cascade="all, delete-orphan")
    biomass_predictions = relationship("BiomassPrediction", back_populates="farm", cascade="all, delete-orphan")
    matches = relationship("Match", back_populates="farm", cascade="all, delete-orphan")

class Crop(Base):
    __tablename__ = "crops"

    id = Column(Integer, primary_key=True, index=True)
    crop_name = Column(String, unique=True, nullable=False)
    residue_ratio = Column(Float, nullable=False)
    recovery_factor = Column(Float, nullable=False)

    # Relationships
    farm_crops = relationship("FarmCrop", back_populates="crop")

class FarmCrop(Base):
    __tablename__ = "farm_crops"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=False)
    crop_id = Column(Integer, ForeignKey("crops.id"), nullable=False)
    season = Column(String, nullable=False)  # e.g., 'Kharif', 'Rabi'
    cultivated_area = Column(Float, nullable=False)  # in hectares
    expected_harvest_date = Column(Date, nullable=False)

    # Relationships
    farm = relationship("Farm", back_populates="farm_crops")
    crop = relationship("Crop", back_populates="farm_crops")

class WeatherData(Base):
    __tablename__ = "weather_data"

    id = Column(Integer, primary_key=True, index=True)
    location = Column(String, nullable=False)  # district or state
    date = Column(Date, nullable=False)
    rainfall = Column(Float, nullable=False)  # in mm
    temperature = Column(Float, nullable=False)  # in Celsius
    humidity = Column(Float, nullable=False)  # in %

class YieldPrediction(Base):
    __tablename__ = "yield_predictions"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=False)
    predicted_yield = Column(Float, nullable=False)  # tons per hectare
    prediction_date = Column(DateTime, default=datetime.utcnow)
    model_version = Column(String, nullable=False)

    # Relationships
    farm = relationship("Farm", back_populates="yield_predictions")

class BiomassPrediction(Base):
    __tablename__ = "biomass_predictions"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=False)
    biomass_quantity = Column(Float, nullable=False)  # in tons
    availability_start = Column(Date, nullable=False)
    availability_end = Column(Date, nullable=False)
    confidence = Column(Float, default=1.0)
    model_version = Column(String, nullable=False)

    # Relationships
    farm = relationship("Farm", back_populates="biomass_predictions")

class Buyer(Base):
    __tablename__ = "buyers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    company_name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    contact_information = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="buyer_profile")
    demands = relationship("BuyerDemand", back_populates="buyer", cascade="all, delete-orphan")
    matches = relationship("Match", back_populates="buyer", cascade="all, delete-orphan")

class BuyerDemand(Base):
    __tablename__ = "buyer_demand"

    id = Column(Integer, primary_key=True, index=True)
    buyer_id = Column(Integer, ForeignKey("buyers.id"), nullable=False)
    biomass_type = Column(String, nullable=False)  # matches Crop.crop_name (e.g., 'Rice')
    required_quantity = Column(Float, nullable=False)  # in tons
    procurement_start = Column(Date, nullable=False)
    procurement_end = Column(Date, nullable=False)
    offered_price = Column(Float, nullable=False)  # price per ton (in currency units, e.g., INR)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    buyer = relationship("Buyer", back_populates="demands")

class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=False)
    buyer_id = Column(Integer, ForeignKey("buyers.id"), nullable=False)
    biomass_quantity = Column(Float, nullable=False)
    distance_km = Column(Float, nullable=False)
    estimated_transport_cost = Column(Float, nullable=False)
    estimated_price = Column(Float, nullable=False)
    estimated_profit = Column(Float, nullable=False)
    match_score = Column(Float, nullable=False)
    reason_text = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    farm = relationship("Farm", back_populates="matches")
    buyer = relationship("Buyer", back_populates="matches")
