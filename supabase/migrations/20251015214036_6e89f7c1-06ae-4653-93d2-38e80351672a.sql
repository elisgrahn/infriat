-- Add measurability_score column to promises table
ALTER TABLE promises 
ADD COLUMN measurability_score INTEGER CHECK (measurability_score >= 1 AND measurability_score <= 5);

COMMENT ON COLUMN promises.measurability_score IS 'Score 1-5 som mäter hur konkret och mätbart löftet är. 5 = mycket mätbart med siffror och tidsram, 1 = vagt och svårt att mäta';