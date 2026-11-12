/**
 * "Hincha de un club" = su club principal o su segundo club. Subconsulta (user_id, club_id) que usan los rankings
 * y los agregados de la comunidad para que quien tiene dos clubes cuente en los dos.
 */
export const FAN_CLUBS = "(SELECT id AS user_id, club_id FROM users UNION ALL SELECT user_id, club_id FROM user_second_club)";
