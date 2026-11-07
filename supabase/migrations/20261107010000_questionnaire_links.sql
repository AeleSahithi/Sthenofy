-- Questionnaire (Google Form) per service, provided by the client on 2026-11-07.
-- Requires 20261107000000_paid_checkout_and_dual_calendar.sql. Editable later in Admin -> Services & Pricing.
-- Pre-Peri and Menopause Nutrition: no form provided yet.

begin;

update public.service_types
set questionnaire_url = 'https://docs.google.com/forms/d/e/1FAIpQLSeyS3JkDmOmEqfXaZO5s8LgFSeEOjsLmcfSI8Bt4Rhgt3wR6Q/viewform', updated_at = now()
where name ilike '%endurance%';

update public.service_types
set questionnaire_url = 'https://docs.google.com/forms/d/e/1FAIpQLSfRwC4PGi-FkUXrzPBEXEhfnx4DX0sKWJBOlEeYzBDzhKgI9Q/viewform', updated_at = now()
where name ilike '%fat loss%' or name ilike '%diabetes%' or name ilike '%pcod%';

update public.service_types
set questionnaire_url = 'https://docs.google.com/forms/d/e/1FAIpQLSdIb6MUePEcjlDYlCBTOEaPNu-LdIUG2ve6-kDJzWOG6eX1RQ/viewform', updated_at = now()
where name ilike '%online training%';

select name, questionnaire_url from public.service_types order by name;

commit;
