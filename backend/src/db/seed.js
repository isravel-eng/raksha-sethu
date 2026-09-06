import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';

const DEMO_EMAIL = 'ananya.reddy@demo.rakshasetu';
const DEMO_PASSWORD = 'Demo@12345';

export { DEMO_EMAIL, DEMO_PASSWORD };

export async function seed(client) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'schema.sql');
  const schema = await fs.readFile(schemaPath, 'utf8');
  await client.query(schema);

  await client.query(`
    TRUNCATE TABLE
      interventions, alerts, predictions, case_events, check_ins, screenings, cases, citizens, users
    RESTART IDENTITY CASCADE
  `);

  const user = await client.query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, 'citizen')
     RETURNING id`,
    [DEMO_EMAIL, passwordHash]
  );
  const userId = user.rows[0].id;

  const citizen = await client.query(
    `INSERT INTO citizens (user_id, name, phone, district, state, consent_given)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     RETURNING id`,
    [userId, 'Ananya Reddy', '9876543210', 'Hyderabad', 'Telangana']
  );
  const citizenId = citizen.rows[0].id;

  const caseRow = await client.query(
    `INSERT INTO cases (citizen_id, case_number, district, state, case_stage, status)
     VALUES ($1, 'RS-2024-00001', 'Hyderabad', 'Telangana', 'TRIAL', 'active')
     RETURNING id`,
    [citizenId]
  );
  const caseId = caseRow.rows[0].id;

  await client.query(
    `INSERT INTO case_events (case_id, event_type, event_date, details_json) VALUES
     ($1, 'FIR', '2024-03-02T09:00:00Z', '{"station":"Banjara Hills PS","fir_number":"FIR-118/2024"}'),
     ($1, 'CHARGESHEET', '2024-05-18T11:00:00Z', '{"chargesheet_number":"CS-44/2024"}'),
     ($1, 'TRIAL_DATE', '2024-08-05T10:00:00Z', '{"hearing_date":"2024-09-20T10:00:00Z","court":"Special Court, Hyderabad"}'),
     ($1, 'HEARING_POSTPONED', '2024-09-18T16:00:00Z', '{"postponement_days":21,"previous_hearing_date":"2024-09-20T10:00:00Z","new_hearing_date":"2024-10-11T10:00:00Z","reason":"Witness unavailable"}'),
     ($1, 'THREAT_REPORTED', '2024-09-22T14:30:00Z', '{"protection_needed":true,"description":"Accused relatives contacted the citizen and warned her not to attend court."}')`,
    [caseId]
  );

  const checkIns = [
    ['2024-03-10T08:00:00Z', 4, 2, 3, 7, 4, 7, 7, 0, 'I filed the complaint and feel supported by my sister.'],
    ['2024-06-02T08:00:00Z', 6, 4, 6, 5, 6, 5, 5, 0, 'The chargesheet is filed but I am tired and worried about the trial.'],
    ['2024-09-25T08:00:00Z', 8, 6, 8, 3, 8, 2, 3, 0, 'I feel unsafe after the threat and the hearing was postponed. I need help.'],
  ];

  const insertedCheckIns = [];
  for (const row of checkIns) {
    const result = await client.query(
      `INSERT INTO check_ins (
         citizen_id, case_id, timestamp, emotional_distress, distress_frequency,
         overwhelm, sleep_quality, fatigue, social_support, coping_ability,
         self_harm_indicator, message_text
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id`,
      [citizenId, caseId, ...row]
    );
    insertedCheckIns.push(result.rows[0].id);
  }

  const latestCheckInId = insertedCheckIns[insertedCheckIns.length - 1];
  const prediction = await client.query(
    `INSERT INTO predictions (
       citizen_id, case_id, check_in_id, risk_level, dynamic_score,
       urgent_probability, confidence, trend, top_risk_factors_json,
       protective_factors_json, human_review_required, model_version
     ) VALUES (
       $1, $2, $3, 'HIGH', 68.4, 0.41, 0.62, 'worsening',
       $4::jsonb, $5::jsonb, TRUE, 'synthetic-risk-v1'
     ) RETURNING id`,
    [
      citizenId,
      caseId,
      latestCheckInId,
      JSON.stringify(['emotional distress', 'worsening trend', 'safety signal']),
      JSON.stringify([]),
    ]
  );

  await client.query(
    `INSERT INTO alerts (citizen_id, case_id, prediction_id, severity, status, message)
     VALUES ($1, $2, $3, 'HIGH', 'open', $4)`,
    [
      citizenId,
      caseId,
      prediction.rows[0].id,
      'Human review required: HIGH risk after threat report and postponed hearing.',
    ]
  );

  return {
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    userId,
    citizenId,
    caseId,
  };
}
