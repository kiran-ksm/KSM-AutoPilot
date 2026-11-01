"""
seed_demo_data.py — Populate DynamoDB with demo leads, activities, and
appointments for a multi-dealership demo tenant (3 locations/brands).

Per spec Section 22: synthetic demo tenant with at least three dealership
locations/brands and representative users/roles.

Usage:
    python scripts/seed_demo_data.py

Safe to re-run: existing leads with the same IDs are overwritten (idempotent).
"""

import os
import sys
import uuid
import random
import json
from datetime import datetime, timezone, timedelta
import boto3

TENANT_ID = os.environ.get("SEED_TENANT_ID", "tenant-dev-001")
TABLE_NAME = os.environ.get("SEED_TABLE_NAME", "")
REGION = os.environ.get("AWS_REGION", "us-east-1")

# ── Three dealership locations ───────────────────────────────────────────────
DEALERSHIPS = [
    {"id": "dealership-mercedes", "name": "Ray Catena Mercedes-Benz of Edison", "brand": "Mercedes-Benz", "location": "Edison, NJ"},
    {"id": "dealership-toyota",   "name": "Tri-State Toyota",                   "brand": "Toyota",       "location": "Woodbridge, NJ"},
    {"id": "dealership-lexus",    "name": "Premier Lexus",                       "brand": "Lexus",         "location": "Bridgewater, NJ"},
]

SALESPEOPLE = [
    {"email": "sarah.mitchell@ksmtechnologies.net", "name": "Sarah Mitchell", "dealershipId": "dealership-mercedes"},
    {"email": "mike.johnson@ksmtechnologies.net",   "name": "Mike Johnson",   "dealershipId": "dealership-mercedes"},
    {"email": "emily.davis@ksmtechnologies.net",    "name": "Emily Davis",   "dealershipId": "dealership-toyota"},
    {"email": "james.wilson@ksmtechnologies.net",    "name": "James Wilson",  "dealershipId": "dealership-toyota"},
    {"email": "lisa.anderson@ksmtechnologies.net",  "name": "Lisa Anderson", "dealershipId": "dealership-lexus"},
    {"email": "david.brown@ksmtechnologies.net",    "name": "David Brown",   "dealershipId": "dealership-lexus"},
]

# ── Demo data pools ──────────────────────────────────────────────────────────

FIRST_NAMES = ["James", "Sarah", "Michael", "Emma", "David", "Lisa", "Chris",
                "Jessica", "Daniel", "Rachel", "Tony", "Sophie", "Mark", "Olivia",
                "Ryan", "Grace", "Ben", "Hannah", "Luke", "Mia", "Aaron", "Chloe",
                "Nathan", "Isla", "Sam", "Ruby", "Connor", "Zoe", "Tyler", "Maya"]

LAST_NAMES = ["Thompson", "Patel", "Nguyen", "Williams", "Garcia", "Khan", "Brown",
              "Lee", "Wilson", "Chen", "Taylor", "Singh", "Anderson", "Murphy",
              "Wright", "Kumar", "Bennett", "Hughes", "Price", "Stewart"]

VEHICLES_BY_BRAND = {
    "Mercedes-Benz": [
        {"year": 2024, "make": "Mercedes-Benz", "model": "C-Class", "trim": "C 300 4MATIC"},
        {"year": 2024, "make": "Mercedes-Benz", "model": "GLE 450", "trim": "GLE 450 4MATIC"},
        {"year": 2023, "make": "Mercedes-Benz", "model": "E-Class", "trim": "E 350 Sedan"},
        {"year": 2024, "make": "Mercedes-Benz", "model": "S-Class", "trim": "S 500 4MATIC"},
    ],
    "Toyota": [
        {"year": 2024, "make": "Toyota", "model": "Camry", "trim": "XSE"},
        {"year": 2024, "make": "Toyota", "model": "RAV4", "trim": "XLE Hybrid"},
        {"year": 2023, "make": "Toyota", "model": "Corolla", "trim": "SE"},
        {"year": 2024, "make": "Toyota", "model": "Highlander", "trim": "Limited"},
    ],
    "Lexus": [
        {"year": 2024, "make": "Lexus", "model": "RX 350", "trim": "Luxury"},
        {"year": 2024, "make": "Lexus", "model": "ES 350", "trim": "Ultra Luxury"},
        {"year": 2023, "make": "Lexus", "model": "IS 350", "trim": "F SPORT"},
        {"year": 2024, "make": "Lexus", "model": "LX 600", "trim": "Ultra Luxury"},
    ],
}

INQUIRY_TYPES = ["VEHICLE_INFORMATION", "TEST_DRIVE", "AVAILABILITY", "TRADE_IN", "FINANCING", "GENERAL_QUESTION"]
INQUIRY_WEIGHTS = [30, 25, 15, 10, 10, 10]

SOURCES = ["WEBSITE", "WALK_IN", "REFERRAL", "SOCIAL", "OTHER"]
SOURCE_WEIGHTS = [45, 15, 20, 12, 8]

STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "APPOINTMENT_REQUESTED", "APPOINTMENT_CONFIRMED",
            "TEST_DRIVE_COMPLETED", "PROPOSAL", "WON", "LOST", "NURTURE"]
STATUS_WEIGHTS = [15, 15, 10, 8, 8, 5, 8, 10, 8, 13]

ACTIVITY_TYPES = ["NOTE", "SMS", "EMAIL", "STATUS_CHANGE", "SCORE", "ASSIGNMENT", "APPOINTMENT"]
ACTIVITY_DESCRIPTIONS = {
    "NOTE": ["Called customer, left voicemail", "Customer requested more info on finance options",
             "Followed up on test drive booking", "Customer asked about trade-in value",
             "Sent brochure and price list", "Customer prefers weekend appointments"],
    "SMS": ["SMS sent: Hi! Your test drive is confirmed for Saturday",
            "SMS sent: Thanks for your enquiry, we'll be in touch shortly",
            "SMS sent: Your vehicle is ready for pickup",
            "SMS sent: Reminder for your appointment tomorrow at 2pm"],
    "EMAIL": ["Email sent: Vehicle quotation and finance breakdown",
              "Email sent: Test drive confirmation and location details",
              "Email sent: Special offer on your preferred model",
              "Email sent: Welcome to KSM AutoPilot — your enquiry has been received"],
    "STATUS_CHANGE": ["Status changed from NEW to CONTACTED",
                      "Status changed from CONTACTED to QUALIFIED",
                      "Status changed from QUALIFIED to APPOINTMENT_REQUESTED",
                      "Status changed from APPOINTMENT_CONFIRMED to TEST_DRIVE_COMPLETED",
                      "Status changed from PROPOSAL to WON"],
    "SCORE": ["AI score updated to 85/100", "AI score updated to 62/100",
              "AI score updated to 91/100", "AI score updated to 74/100",
              "AI score updated to 58/100"],
    "ASSIGNMENT": ["Lead assigned to Sarah Mitchell",
                   "Lead assigned to Mike Johnson",
                   "Lead assigned to Emily Davis",
                   "Lead assigned to Lisa Anderson"],
    "APPOINTMENT": ["Appointment requested: Test drive for Saturday",
                    "Appointment confirmed by salesperson",
                    "Appointment rescheduled to next week",
                    "Test drive completed — customer very interested"],
}

LEADS_PER_DEALERSHIP = 12  # ~36 total
ACTIVITIES_PER_LEAD = (0, 6)  # min, max


def generate_phone():
    area = random.randint(201, 989)
    prefix = random.randint(200, 999)
    line = random.randint(1000, 9999)
    return f"({area}) {prefix}-{line}"


def generate_email(first, last):
    domains = ["gmail.com", "outlook.com", "yahoo.com", "hotmail.com", "icloud.com",
               "aol.com", "comcast.net", "verizon.net"]
    return f"{first.lower()}.{last.lower()}@{random.choice(domains)}"


def random_iso(days_ago):
    base = datetime.now(timezone.utc) - timedelta(days=days_ago)
    hour = random.randint(8, 18)
    minute = random.randint(0, 59)
    base = base.replace(hour=hour, minute=minute, second=random.randint(0, 59))
    return base.isoformat()


def build_lead(tenant_id, lead_id, dealership, salesperson, status, days_ago):
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    created = random_iso(days_ago)
    updated = random_iso(max(0, days_ago - random.randint(0, 3)))
    vehicle = random.choice(VEHICLES_BY_BRAND[dealership["brand"]])
    inquiry_type = random.choices(INQUIRY_TYPES, weights=INQUIRY_WEIGHTS)[0]
    source = random.choices(SOURCES, weights=SOURCE_WEIGHTS)[0]
    ai_score = random.randint(55, 95) if random.random() > 0.35 else None

    attribution = {}
    if source == "WEBSITE":
        attribution = {
            "utmSource": random.choice(["google", "facebook", "bing", "dealer_website"]),
            "utmMedium": random.choice(["cpc", "organic", "social", "referral"]),
            "utmCampaign": random.choice(["summer_sale", "new_models", "trade_in_offer", "financing_special"]),
        }

    if ai_score and ai_score >= 80:
        priority = "HOT"
    elif ai_score and ai_score >= 60:
        priority = "WARM"
    elif status == "NEW" and vehicle:
        priority = "WARM"
    else:
        priority = "COLD" if random.random() > 0.3 else "UNCLASSIFIED"

    return {
        "PK": f"TENANT#{tenant_id}",
        "SK": f"LEAD#{lead_id}",
        "GSI1PK": f"STATUS#{status}",
        "GSI1SK": f"TENANT#{tenant_id}#LEAD#{lead_id}",
        "leadId": lead_id,
        "tenantId": tenant_id,
        "dealershipId": dealership["id"],
        "dealershipName": dealership["name"],
        "firstName": first,
        "lastName": last,
        "email": generate_email(first, last),
        "phone": generate_phone(),
        "inquiryType": inquiry_type,
        "vehicleInterest": {"year": vehicle["year"], "make": vehicle["make"], "model": vehicle["model"], "trim": vehicle["trim"]},
        "status": status,
        "source": source,
        "priority": priority,
        "aiScore": ai_score,
        "aiReasoning": "Vehicle interest and engagement signals suggest strong purchase intent. Customer showed specific model preference." if ai_score else None,
        "aiNextAction": random.choice(["Schedule a test drive within 48 hours", "Send personalized financing options", "Follow up on trade-in valuation request", "Invite to weekend showcase event"]) if ai_score else None,
        "assignedTo": salesperson["email"] if salesperson and random.random() > 0.2 else None,
        "assignedToName": salesperson["name"] if salesperson and random.random() > 0.2 else None,
        "notes": random.choice(["Interested in weekend test drive", "Comparing with competitor models", "Wants finance pre-approval before committing", "Trade-in vehicle: 2019 Toyota Corolla", "First-time buyer, needs guidance on options", "Returning customer, previous purchase 2 years ago", ""]),
        "message": random.choice(["I'd like to schedule a test drive for this weekend.", "Can you send me pricing information for this vehicle?", "What's the current availability of this model?", "I have a trade-in and would like an estimate.", ""]),
        "preferredContactMethod": random.choice(["EMAIL", "PHONE", "SMS", "ANY"]),
        "preferredContactTime": random.choice(["", "Weekday mornings", "Weekends", "After 5pm", ""]),
        "consent": {"email": True, "sms": random.random() > 0.4, "phone": random.random() > 0.3},
        "attribution": attribution if attribution else None,
        "lastActivity": updated,
        "nextFollowUp": random_iso(max(0, days_ago - random.randint(0, 7))) if status in ["NEW", "CONTACTED", "QUALIFIED", "NURTURE"] else None,
        "createdAt": created,
        "updatedAt": updated,
    }


def build_activity(tenant_id, lead, days_ago):
    activity_type = random.choice(ACTIVITY_TYPES)
    ts = random_iso(days_ago)
    activity_id = str(uuid.uuid4())
    return {
        "PK": f"TENANT#{tenant_id}",
        "SK": f"ACTIVITY#{ts}#{activity_id}",
        "activityId": activity_id,
        "leadId": lead["leadId"],
        "leadName": f"{lead['firstName']} {lead['lastName']}",
        "tenantId": tenant_id,
        "type": activity_type,
        "description": random.choice(ACTIVITY_DESCRIPTIONS[activity_type]),
        "createdAt": ts,
    }


def build_appointment(tenant_id, lead, dealership, status, days_offset):
    now = datetime.now(timezone.utc)
    appt_id = str(uuid.uuid4())
    appt_date = now + timedelta(days=days_offset)
    return {
        "PK": f"TENANT#{tenant_id}",
        "SK": f"APPOINTMENT#{appt_id}",
        "appointmentId": appt_id,
        "leadId": lead["leadId"],
        "tenantId": tenant_id,
        "dealershipId": dealership["id"],
        "type": random.choice(["TEST_DRIVE", "VEHICLE_VIEWING", "NEGOTIATION"]),
        "status": status,
        "requestedDate": appt_date.isoformat(),
        "timezone": "America/New_York",
        "location": dealership["name"],
        "notes": random.choice(["Customer requested afternoon slot", "First-time visitor — provide showroom tour", "Bringing spouse for the test drive", "Interested in comparing two models"]),
        "createdAt": now.isoformat(),
        "updatedAt": now.isoformat(),
    }


def main():
    if not TABLE_NAME:
        import subprocess
        result = subprocess.run(["aws", "cloudformation", "describe-stacks", "--stack-name", "KsmAp-dev-Database"], capture_output=True, text=True)
        if result.returncode == 0:
            data = json.loads(result.stdout)
            for output in data["Stacks"][0]["Outputs"]:
                if output["OutputKey"] == "TableName":
                    globals()["TABLE_NAME"] = output["OutputValue"]
                    break
        if not TABLE_NAME:
            print("ERROR: Could not determine DynamoDB table name.")
            sys.exit(1)

    print(f"Seeding multi-dealership demo data into: {TABLE_NAME}")
    print(f"  Tenant: {TENANT_ID}")
    print(f"  Dealerships: {len(DEALERSHIPS)}")
    print(f"  Salespeople: {len(SALESPEOPLE)}")
    print(f"  Region: {REGION}\n")

    dynamodb = boto3.resource("dynamodb", region_name=REGION)
    table = dynamodb.Table(TABLE_NAME)

    leads = []
    appointments = []
    items_to_write = []

    for dealership in DEALERSHIPS:
        sp_list = [s for s in SALESPEOPLE if s["dealershipId"] == dealership["id"]]
        for i in range(LEADS_PER_DEALERSHIP):
            lead_id = str(uuid.uuid4())
            status = random.choices(STATUSES, weights=STATUS_WEIGHTS)[0]
            days_ago = random.randint(0, 60)
            sp = random.choice(sp_list) if sp_list and random.random() > 0.15 else None
            lead = build_lead(TENANT_ID, lead_id, dealership, sp, status, days_ago)
            leads.append(lead)
            items_to_write.append(lead)

            if status == "APPOINTMENT_REQUESTED":
                appt = build_appointment(TENANT_ID, lead, dealership, "REQUESTED", random.randint(1, 14))
                appointments.append(appt)
                items_to_write.append(appt)
            elif status == "APPOINTMENT_CONFIRMED":
                appt = build_appointment(TENANT_ID, lead, dealership, "CONFIRMED", random.randint(1, 7))
                appt["confirmedBy"] = sp["email"] if sp else "admin@ksmautopilot.dev"
                appt["confirmedAt"] = appt["createdAt"]
                appointments.append(appt)
                items_to_write.append(appt)
            elif status == "TEST_DRIVE_COMPLETED":
                appt = build_appointment(TENANT_ID, lead, dealership, "COMPLETED", -random.randint(1, 14))
                appt["confirmedBy"] = sp["email"] if sp else "admin@ksmautopilot.dev"
                appointments.append(appt)
                items_to_write.append(appt)

    activity_count = 0
    print("Generating activities...")
    for lead in leads:
        n_activities = random.randint(*ACTIVITIES_PER_LEAD)
        for j in range(n_activities):
            days_ago = random.randint(0, 60)
            activity = build_activity(TENANT_ID, lead, days_ago)
            items_to_write.append(activity)
            activity_count += 1

    print(f"Writing {len(items_to_write)} items ({len(leads)} leads + {activity_count} activities + {len(appointments)} appointments)...")
    written = 0
    for i in range(0, len(items_to_write), 25):
        batch = items_to_write[i:i + 25]
        with table.batch_writer() as bw:
            for item in batch:
                bw.put_item(Item=item)
        written += len(batch)
        print(f"  Written {written}/{len(items_to_write)}...", end="\r")

    print(f"\n\nDone! Seeded {len(leads)} leads, {activity_count} activities, {len(appointments)} appointments.")

    print("\nDealership breakdown:")
    for d in DEALERSHIPS:
        d_leads = [l for l in leads if l["dealershipId"] == d["id"]]
        scored = sum(1 for l in d_leads if l.get("aiScore"))
        hot = sum(1 for l in d_leads if l.get("priority") == "HOT")
        print(f"  {d['name']} ({d['brand']})")
        print(f"    Leads: {len(d_leads)} | AI scored: {scored} | Hot: {hot}")

    print(f"\nLogin at https://d26x1mouwd2br3.cloudfront.net with:")
    print(f"  Email:    admin@ksmautopilot.dev")
    print(f"  Password: KsmAutoPilot2026!")


if __name__ == "__main__":
    main()
