-- Update Kristersson government period (2022-) to add SD as support party
UPDATE government_periods
SET support_parties = ARRAY['Sverigedemokraterna']
WHERE id = 'a488bd04-de69-49aa-8bd9-dad77b1ca1ec';