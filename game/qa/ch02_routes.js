// Chapter 2 (Biology Park) route catalogue shared by the engine suite (validate_ch02_routes.js) and
// the browser suite (run_ch02_routes_qa.js). Every route starts from a real Prologue playthrough,
// goes through a real House of Tomorrow exit and its CONTINUE card into Chapter 2: no invented
// inventory, flags or dice. A route names the hidden-check outcomes it needs; findSeed() searches
// fixed seeds 1..N for one whose real rolls give exactly those outcomes (dice depend only on the
// seed and the check id, never on order or time).
'use strict';
const Rules = require('../js/rules.js');

function stepAll(story, state, steps) {
  let s = state;
  for (const st of steps) {
    const input = typeof st === 'string' ? { choice: st } : st;
    if (input.choice) {
      const v = Rules.view(story, s);
      if (!v.cards.some((c) => c.id === input.choice)) {
        const e = new Error('node ' + s.chapter + ':' + s.node + ' lacks ' + input.choice + ' (has ' + v.cards.map((c) => c.id).join(', ') + ')');
        e.missing = input.choice;
        throw e;
      }
    }
    s = Rules.step(story, s, input).state;
  }
  return s;
}

// Prologue ----------------------------------------------------------------------------------------
const START = ['head_to_restroom', 'drone_show_form', 'sign_notice', 'signed_move_on', 'go_to_exit', 'take_box_and_leave'];
const TO_EXPO = ['enter_exposition', 'pass_turnstile'];
const AFTER_RECEPTION = ['speak_to_receptionist', 'ask_for_restroom', 'wait_for_assistance', 'accept_for_directions',
  'move_on_practical', 'leave_reception', 'continue_to_chapter_01'];
const KEEP = { desk_plant: 'keep_plant', red_stapler: 'keep_stapler', timing_clicker: 'keep_clicker', rubber_band_ball: 'keep_band_ball' };
function prologue(story, item, seed) {
  let s = stepAll(story, Rules.begin(story, { seed: String(seed) }).state, START);
  s = Rules.step(story, s, { item: 'effects_box_full', verb: 'inspect' }).state;
  s = stepAll(story, s, TO_EXPO);
  s = stepAll(story, s, item ? ['keep_one', KEEP[item], 'continue_to_reception_kept_one'] : ['deposit_all', 'continue_to_reception_stored']);
  return stepAll(story, s, AFTER_RECEPTION);
}

// House of Tomorrow: the five surviving exits (and the fatal chair) ------------------------------
const ENTRY = ['enter_show_home', 'hear_house_greeting'];
const RECOVER = ['permit_housekeeping', 'ask_for_bathroom_after_storage', 'recover_belongings_now', 'take_back_house_item', 'return_from_cabinet'];
const NO_PLANT = ENTRY.concat(['permit_housekeeping', 'ask_for_bathroom_after_storage', 'refuse_everything', 'ask_to_leave_house']);
const HOUSE = {
  plant: { item: 'desk_plant', exit: 'exit_named_plant', route: 'plant',
    path: ENTRY.concat(RECOVER, ['refuse_everything', 'ask_to_leave_house', 'name_plant_and_leave', 'give_named_plant_to_house']) },
  martin: { exit: 'exit_martin', route: 'martin',
    path: NO_PLANT.concat(['no_plant_first_foyer', 'go_to_mandatory_dinner', 'reply_for_martin', 'look_around_martin_room', 'trace_martin_map', 'climb_through_service_hatch']) },
  showroom: { exit: 'exit_showroom_reset', route: 'showroom_reset',
    path: NO_PLANT.concat(['no_plant_first_foyer', 'go_to_mandatory_dinner', 'interrupt_family_dinner', 'after_dinner_no_plant', 'attend_photo_session',
      'inspect_album', 'close_album', 'confront_house_about_album', 'let_house_change_subject', 'use_bathroom_at_last',
      'accept_completed_demonstration', 'leave_during_reset']) },
  clean: { exit: 'exit_service_clean', route: 'mechanical', checks: { house_service_release_mishap: true },
    path: ENTRY.concat(['permit_housekeeping', 'ask_for_bathroom_after_storage', 'consider_rest_assured', 'enter_rest_assured', 'physical_chair_breakout',
      'go_direct_service_exit', 'force_service_release']), chair: 'house_chair_unarmed' },
  registered: { exit: 'exit_service_registered', route: 'mechanical', checks: { house_service_release_mishap: false },
    path: ENTRY.concat(['permit_housekeeping', 'ask_for_bathroom_after_storage', 'consider_rest_assured', 'enter_rest_assured', 'physical_chair_breakout',
      'go_direct_service_exit', 'force_service_release']), chair: 'house_chair_unarmed' },
  // Held red stapler through the chair (recovered from housekeeping), clean or registered release.
  stapler_clean: { item: 'red_stapler', exit: 'exit_service_clean', route: 'mechanical', checks: { house_service_release_mishap: true },
    path: ENTRY.concat(RECOVER, ['consider_rest_assured', 'enter_rest_assured', 'stapler_breakout', 'go_direct_service_exit', 'force_service_release']), chair: 'house_chair_stapler' },
  stapler_registered: { item: 'red_stapler', exit: 'exit_service_registered', route: 'mechanical', checks: { house_service_release_mishap: false },
    path: ENTRY.concat(RECOVER, ['consider_rest_assured', 'enter_rest_assured', 'stapler_breakout', 'go_direct_service_exit', 'force_service_release']), chair: 'house_chair_stapler' },
  // Retained clicker / rubber-band ball recovered from housekeeping, then Martin's passage.
  clicker_martin: { item: 'timing_clicker', exit: 'exit_martin', route: 'martin',
    path: ENTRY.concat(RECOVER, ['refuse_everything', 'ask_to_leave_house', 'no_plant_first_foyer', 'go_to_mandatory_dinner', 'reply_for_martin',
      'look_around_martin_room', 'trace_martin_map', 'climb_through_service_hatch']) },
  ball_martin: { item: 'rubber_band_ball', exit: 'exit_martin', route: 'martin',
    path: ENTRY.concat(RECOVER, ['refuse_everything', 'ask_to_leave_house', 'no_plant_first_foyer', 'go_to_mandatory_dinner', 'reply_for_martin',
      'look_around_martin_room', 'trace_martin_map', 'climb_through_service_hatch']) },
  chair_fatal: { exit: 'exit_chair_fatal', fatal: true,
    path: ENTRY.concat(['permit_housekeeping', 'ask_for_bathroom_after_storage', 'consider_rest_assured', 'enter_rest_assured', 'physical_chair_breakout']), chairFail: 'house_chair_unarmed' }
};
// Arrival narration variant each House route must produce in bureau_arrival (by its distinctive words).
const ARRIVAL = { plant: /teaches your little plant/, martin: /Martin's dusty service corridor/, showroom_reset: /declared your bathroom needs fulfilled/,
  registered: /still identifies you as household property/, mechanical: /through a service passage\. The next building/ };

// Chapter 2 ---------------------------------------------------------------------------------------
const BUREAU = ['inspect_closed_conveniences', 'see_groundskeeper', 'react_to_gardener'];
const G = {
  review: ['examine_landscape_performance', 'request_zero_compliance_review', 'enter_from_performance_review'],
  director: ['examine_landscape_performance', 'accept_instant_vegetation_promotion', 'open_formal_park_gate', 'enter_authorized_jungle'],
  jamPass: ['sacrifice_stapler_to_feeder', 'leave_gardener_service_access'],
  hopperPass: ['hide_in_supply_hopper', 'climb_from_irrigation_trench']
};
const FLOWER = ['read_flower_district_decree'];
const TO_FLOWER_TRACE = ['head_to_tower', 'inspect_tower_approvals', 'trace_original_requests', 'follow_trace_to_flower'].concat(FLOWER);
const TO_FLOWER_GRADE = ['cross_spore_exhibits', 'vent_spores_into_offices', 'cross_vented_garden', 'skirt_forest_on_irrigation_grade'].concat(FLOWER);
const IRRIGATION_OUT = ['find_maintenance_service_exit'];

// Each route: house (entry key), steps, checks {id: pass?}, end node, then expectations (e).
const ROUTES = [
  // Gardener ---------------------------------------------------------------------------------------
  { name: 'review_tower_trace_courier_carry', house: 'plant', steps: BUREAU.concat(G.review, TO_FLOWER_TRACE, ['accept_seed_courier', 'carry_seeds_to_customs', 'carry_sealed_seeds_out', 'leave_cargo_checkpoint']),
    end: 'end_customs', e: { group: 'public_concourse', exit: 'courier_carried', has: ['certified_seed_canister'], lacks: ['acting_director_badge'], flags: { expansion_orders_seen: true, tower_visited: true } } },
  { name: 'director_badge_tower_cease_maintenance', house: 'martin', steps: BUREAU.concat(G.director, ['head_to_tower', 'inspect_tower_approvals', 'issue_director_countermand', 'order_cease_and_desist', 'descend_cease_stairwell'], IRRIGATION_OUT, ['leave_through_maintenance_door']),
    end: 'end_maintenance', e: { group: 'service_infrastructure', exit: 'director_cease', has: ['acting_director_badge'] }, notSeen: ['flower_arrival'] },
  { name: 'director_refers_dispute_then_appeal', house: 'showroom', steps: BUREAU.concat(G.director, ['head_to_tower', 'inspect_tower_approvals', 'issue_director_countermand', 'refer_appeal_to_plant', 'arrive_at_flower_with_appeal'], FLOWER,
    ['contest_habitat_order', 'appeal_director_authority', 'take_director_personnel_exit', 'leave_through_public_door']),
    end: 'end_public', e: { group: 'public_concourse', exit: 'appeal_director', flags: { director_pending_dispute: true }, has: ['acting_director_badge', 'family_portrait_photo'] } },
  { name: 'stapler_jam_pass', house: 'stapler_clean', steps: BUREAU.concat(G.jamPass, TO_FLOWER_GRADE, ['accept_seed_courier', 'carry_seeds_to_customs', 'transfer_seeds_to_network', 'leave_cargo_checkpoint']),
    checks: { ch2_gardener_feeder: true }, end: 'end_customs', e: { group: 'public_concourse', exit: 'courier_surrendered', lacks: ['red_stapler', 'certified_seed_canister'], flags: { seeds_entered_distribution: true, office_spore_inundation: true } } },
  { name: 'stapler_jam_fail_sorter_escape', house: 'stapler_registered', steps: BUREAU.concat(['sacrifice_stapler_to_feeder', 'grab_sorting_inspection_hatch', 'climb_out_of_sorter'], TO_FLOWER_GRADE,
    ['contest_habitat_order', 'appeal_prior_house_equipment', 'take_disputed_transfer_corridor', 'leave_through_public_door']),
    checks: { ch2_gardener_feeder: false, ch2_sorter_inspection_hatch: true }, end: 'end_public', e: { group: 'public_concourse', exit: 'appeal_house_equipment', lacks: ['red_stapler'], flags: { equipment_registered: true } } },
  { name: 'stapler_jam_fail_sorter_fatal', house: 'stapler_clean', steps: BUREAU.concat(['sacrifice_stapler_to_feeder', 'grab_sorting_inspection_hatch']),
    checks: { ch2_gardener_feeder: false, ch2_sorter_inspection_hatch: false }, end: 'fatal_sorter', fatal: true, e: { lacks: ['red_stapler'] } },
  { name: 'hopper_fatal', house: 'martin', steps: BUREAU.concat(['hide_in_supply_hopper']), checks: { ch2_hopper_burial: false }, end: 'fatal_hopper', fatal: true },
  // Spore Garden, walkway, Moving Forest ---------------------------------------------------------
  { name: 'spore_infected_thorn_infected_breakout_fatal', house: 'martin', steps: BUREAU.concat(G.hopperPass, ['cross_spore_exhibits', 'cross_spore_cloud_direct', 'follow_garden_infected', 'enter_moving_forest', 'push_through_thorns', 'enter_flower_with_thorn'], FLOWER,
    ['contest_habitat_order', 'appeal_biological_evidence', 'break_planting_restraints', 'complete_infected_transformation']),
    checks: { ch2_hopper_burial: true, ch2_spore_direct: false, ch2_thorn_gap: false, ch2_biological_appeal: false, ch2_planting_breakout: false }, end: 'fatal_transformation', fatal: true,
    e: { flags: { spore_infected: true, thorn_infected: true } } },
  { name: 'spore_only_breakout_fatal', house: 'plant', steps: BUREAU.concat(G.review, ['cross_spore_exhibits', 'cross_spore_cloud_direct', 'follow_garden_infected', 'skirt_forest_on_irrigation_grade'], FLOWER,
    ['contest_habitat_order', 'appeal_biological_evidence', 'break_planting_restraints', 'complete_spore_transformation']),
    checks: { ch2_spore_direct: false, ch2_biological_appeal: false, ch2_planting_breakout: false }, end: 'fatal_transformation', fatal: true, e: { flags: { spore_infected: true } } },
  { name: 'walkway_pass_forest_overhead_biology_appeal_spore_free', house: 'clean', steps: BUREAU.concat(G.review, ['cross_spore_exhibits', 'take_broken_perimeter', 'cross_broken_grates', 'leave_walkway', 'enter_moving_forest', 'climb_forest_observation', 'descend_to_flower'], FLOWER,
    ['contest_habitat_order', 'appeal_biological_evidence', 'leave_after_biological_appeal', 'leave_through_public_door']),
    checks: { ch2_walkway_crossing: true, ch2_forest_walkway: true, ch2_biological_appeal: true }, end: 'end_public', e: { group: 'public_concourse', exit: 'appeal_biological', notFlags: ['spore_infected', 'thorn_infected'] } },
  { name: 'walkway_fail_forest_fall_markers', house: 'martin', steps: BUREAU.concat(G.review, ['cross_spore_exhibits', 'take_broken_perimeter', 'cross_broken_grates', 'ride_platform_to_path', 'enter_moving_forest', 'climb_forest_observation', 'climb_from_gantry'], FLOWER,
    ['contest_habitat_order', 'appeal_examiner_inspection', 'leave_under_examiner_protection', 'leave_through_public_door']),
    checks: { ch2_walkway_crossing: false, ch2_forest_walkway: false, ch2_examiner_appeal: true }, end: 'end_public', e: { group: 'public_concourse', exit: 'appeal_examiner' } },
  { name: 'forest_markers_sensor_gallery_thorn_free', house: 'showroom', steps: BUREAU.concat(G.review, ['cross_spore_exhibits', 'cross_spore_cloud_direct', 'follow_garden_edge', 'enter_moving_forest', 'follow_movement_markers', 'leave_gallery_for_flower'], FLOWER,
    ['contest_habitat_order', 'appeal_examiner_inspection', 'present_examiner_interlock', 'leave_when_planting_stops', 'leave_through_public_door']),
    checks: { ch2_spore_direct: true, ch2_examiner_appeal: false }, end: 'end_public', e: { group: 'public_concourse', exit: 'emergency_reclassified', notFlags: ['spore_infected', 'thorn_infected'], has: ['expo_examiner_badge'] } },
  { name: 'thorn_pass_uninfected_breakout_fail_chute_pass', house: 'plant', steps: BUREAU.concat(G.review, ['cross_spore_exhibits', 'vent_spores_into_offices', 'cross_vented_garden', 'enter_moving_forest', 'push_through_thorns', 'enter_flower_from_ground'], FLOWER,
    ['contest_habitat_order', 'appeal_biological_evidence', 'break_planting_restraints', 'dive_into_incompatible_waste_chute', 'emerge_from_flower_waste'], IRRIGATION_OUT, ['leave_through_maintenance_door']),
    checks: { ch2_thorn_gap: true, ch2_biological_appeal: false, ch2_planting_breakout: false, ch2_flower_waste_chute: true }, end: 'end_maintenance',
    e: { group: 'service_infrastructure', exit: 'flower_waste_chute', notFlags: ['spore_infected', 'thorn_infected'], flags: { botanical_infection_state: 'none' } } },
  { name: 'uninfected_breakout_fail_chute_fatal', house: 'martin', steps: BUREAU.concat(G.review, TO_FLOWER_GRADE.slice(0, -1), FLOWER,
    ['contest_habitat_order', 'appeal_biological_evidence', 'break_planting_restraints', 'dive_into_incompatible_waste_chute']),
    checks: { ch2_biological_appeal: false, ch2_planting_breakout: false, ch2_flower_waste_chute: false }, end: 'fatal_planting', fatal: true },
  { name: 'planting_breakout_pass_infected_survives', house: 'martin', steps: BUREAU.concat(G.review, ['cross_spore_exhibits', 'cross_spore_cloud_direct', 'follow_garden_infected', 'skirt_forest_on_irrigation_grade'], FLOWER,
    ['contest_habitat_order', 'appeal_biological_evidence', 'break_planting_restraints', 'reach_irrigation_after_breakout'], IRRIGATION_OUT, ['leave_through_maintenance_door']),
    checks: { ch2_spore_direct: false, ch2_biological_appeal: false, ch2_planting_breakout: true }, end: 'end_maintenance',
    e: { group: 'service_infrastructure', exit: 'planting_breakout', flags: { spore_infected: true } } },
  { name: 'stapler_form_interlock_consumes_stapler', house: 'stapler_registered', steps: BUREAU.concat(G.review, TO_FLOWER_GRADE, ['contest_habitat_order', 'appeal_biological_evidence', 'file_stapled_equipment_form', 'leave_without_stapler', 'leave_through_public_door']),
    checks: { ch2_biological_appeal: false }, end: 'end_public', e: { group: 'public_concourse', exit: 'emergency_stapler_form', lacks: ['red_stapler'] } },
  { name: 'equipment_interlock_registered', house: 'registered', steps: BUREAU.concat(G.review, TO_FLOWER_GRADE, ['contest_habitat_order', 'appeal_biological_evidence', 'invoke_existing_equipment_interlock', 'leave_when_planting_stops', 'leave_through_public_door']),
    checks: { ch2_biological_appeal: false }, end: 'end_public', e: { group: 'public_concourse', exit: 'emergency_reclassified', flags: { equipment_registered: true } } },
  { name: 'director_override_interlock', house: 'showroom', steps: BUREAU.concat(G.director, ['cross_spore_exhibits', 'take_broken_perimeter', 'cross_broken_grates', 'leave_walkway', 'skirt_forest_on_irrigation_grade'], FLOWER,
    ['contest_habitat_order', 'appeal_biological_evidence', 'invoke_director_emergency_override', 'leave_when_planting_stops', 'leave_through_public_door']),
    checks: { ch2_walkway_crossing: true, ch2_biological_appeal: false }, end: 'end_public', e: { group: 'public_concourse', exit: 'emergency_reclassified', has: ['acting_director_badge'] } },
  // Tram ---------------------------------------------------------------------------------------------
  { name: 'tram_roof_pass_reserve_power_pass_courier_destroy', house: 'plant', steps: BUREAU.concat(G.review, ['board_nature_tram', 'watch_tram_become_greenhouse', 'climb_rooted_tram_roof', 'follow_tram_siding_roof', 'inspect_abandoned_reserve', 'restore_tram_power', 'step_from_powered_tram'], FLOWER,
    ['accept_seed_courier', 'carry_seeds_to_customs', 'break_seed_canister', 'leave_without_viable_seeds', 'leave_cargo_checkpoint']),
    checks: { ch2_tour_roof: true, ch2_reserve_power: true, ch2_seed_destruction: true }, end: 'end_customs',
    e: { group: 'public_concourse', exit: 'courier_destroyed', flags: { seeds_destroyed: true }, lacks: ['certified_seed_canister'], notFlags: ['courtesy_driver_activated'] } },
  { name: 'tram_roof_fall_forest_courier_rupture_infected', house: 'martin', steps: BUREAU.concat(G.review, ['board_nature_tram', 'watch_tram_become_greenhouse', 'climb_rooted_tram_roof', 'find_route_from_roof_fall', 'follow_movement_markers', 'leave_gallery_for_flower'], FLOWER,
    ['accept_seed_courier', 'carry_seeds_to_customs', 'break_seed_canister', 'shield_against_seed_dust', 'leave_after_dust_exposure', 'leave_cargo_checkpoint']),
    checks: { ch2_tour_roof: false, ch2_seed_destruction: false, ch2_customs_seed_dust: false }, end: 'end_customs',
    e: { group: 'public_concourse', exit: 'courier_ruptured', flags: { spore_infected: true }, lacks: ['certified_seed_canister'] } },
  { name: 'courier_rupture_dust_avoided', house: 'showroom', steps: BUREAU.concat(G.review, TO_FLOWER_GRADE, ['accept_seed_courier', 'carry_seeds_to_customs', 'break_seed_canister', 'shield_against_seed_dust', 'leave_ruptured_cargo', 'leave_cargo_checkpoint']),
    checks: { ch2_seed_destruction: false, ch2_customs_seed_dust: true }, end: 'end_customs', e: { group: 'public_concourse', exit: 'courier_ruptured', notFlags: ['spore_infected'] } },
  { name: 'tram_brake_forest_thorn_infected_appeal_pass', house: 'clean', steps: BUREAU.concat(G.review, ['board_nature_tram', 'watch_tram_become_greenhouse', 'pull_rooted_tram_brake', 'enter_forest_after_slide', 'push_through_thorns', 'enter_flower_with_thorn'], FLOWER,
    ['contest_habitat_order', 'appeal_biological_evidence', 'leave_after_biological_appeal', 'leave_through_public_door']),
    checks: { ch2_thorn_gap: false, ch2_biological_appeal: true }, end: 'end_public', e: { group: 'public_concourse', exit: 'appeal_biological', flags: { thorn_infected: true } } },
  { name: 'tram_rescue_reserve_power_fail_maintenance', house: 'registered', steps: BUREAU.concat(G.review, ['board_nature_tram', 'watch_tram_become_greenhouse', 'call_rooted_tram_rescue', 'approach_reserve_tram', 'inspect_abandoned_reserve', 'restore_tram_power', 'climb_from_power_failure'], IRRIGATION_OUT, ['leave_through_maintenance_door']),
    checks: { ch2_reserve_power: false }, end: 'end_maintenance', e: { group: 'service_infrastructure', exit: 'reserve_power_failure', notFlags: ['courtesy_driver_activated'] } },
  { name: 'tram_siding_walk_tracks', house: 'plant', steps: BUREAU.concat(G.review, ['board_nature_tram', 'watch_tram_become_greenhouse', 'call_rooted_tram_rescue', 'approach_reserve_tram', 'inspect_abandoned_reserve', 'walk_reserve_tram_tracks', 'reach_flower_on_foot'], FLOWER,
    ['interfere_with_translator', 'reroute_approval_punch_tape', 'use_paper_delay', 'run_to_tower_first_visit', 'leave_late_tower', 'leave_through_public_door']),
    end: 'end_public', e: { group: 'public_concourse', exit: 'sabotage_tower_escape', flags: { tower_visited: true }, notFlags: ['courtesy_driver_activated'] } },
  { name: 'reserve_spur_robot_concourse', house: 'showroom', steps: BUREAU.concat(G.review, ['board_nature_tram', 'watch_tram_become_greenhouse', 'call_rooted_tram_rescue', 'approach_reserve_tram', 'inspect_abandoned_reserve', 'activate_emergency_spur', 'leave_crashed_tram']),
    checks: { ch2_courtesy_driver: true }, end: 'end_concourse_robot', e: { group: 'public_concourse', exit: 'tram_robot_crash', flags: { courtesy_driver_activated: true, tram_crash_liability: true }, notFlags: ['tram_satisfaction_certified'] } },
  { name: 'reserve_spur_silent_station', house: 'martin', steps: BUREAU.concat(G.review, ['board_nature_tram', 'watch_tram_become_greenhouse', 'climb_rooted_tram_roof', 'follow_tram_siding_roof', 'inspect_abandoned_reserve', 'activate_emergency_spur', 'arrive_underground_station', 'certify_enjoyable_journey']),
    checks: { ch2_tour_roof: true, ch2_courtesy_driver: false }, end: 'end_underground_station', e: { group: 'underground_transit', exit: 'tram_silent_station', flags: { tram_satisfaction_certified: true }, notFlags: ['courtesy_driver_activated', 'tram_crash_liability'] } },
  // Translator sabotage ------------------------------------------------------------------------------
  { name: 'cables_pass_root_door_maintenance', house: 'martin', steps: BUREAU.concat(G.review, TO_FLOWER_GRADE, ['interfere_with_translator', 'disconnect_biofeedback_cables', 'choose_recoil_escape', 'take_root_exposed_service_door'], IRRIGATION_OUT, ['leave_through_maintenance_door']),
    checks: { ch2_translator_cables: true }, end: 'end_maintenance', e: { group: 'service_infrastructure', exit: 'translator_root_door', flags: { roots_recoiled: true } } },
  { name: 'cables_fail_duct_pass', house: 'plant', steps: BUREAU.concat(G.review, TO_FLOWER_GRADE, ['interfere_with_translator', 'disconnect_biofeedback_cables', 'crawl_clear_of_cable_alarm', 'escape_cables_into_irrigation'], IRRIGATION_OUT, ['leave_through_maintenance_door']),
    checks: { ch2_translator_cables: false, ch2_cable_alarm_escape: true }, end: 'end_maintenance', e: { group: 'service_infrastructure', exit: 'cable_alarm_duct' } },
  { name: 'cables_fail_duct_fatal', house: 'showroom', steps: BUREAU.concat(G.review, TO_FLOWER_GRADE, ['interfere_with_translator', 'disconnect_biofeedback_cables', 'crawl_clear_of_cable_alarm']),
    checks: { ch2_translator_cables: false, ch2_cable_alarm_escape: false }, end: 'fatal_roots', fatal: true },
  { name: 'staple_loop_pass_tower_bypass', house: 'stapler_clean', steps: BUREAU.concat(G.review, TO_FLOWER_TRACE, ['interfere_with_translator', 'staple_punch_tape_loop', 'use_stapled_delay', 'run_past_visited_tower', 'leave_tower_bypass', 'leave_through_public_door']),
    checks: { ch2_stapled_punch_tape: true }, end: 'end_public', e: { group: 'public_concourse', exit: 'sabotage_tower_bypass', has: ['red_stapler'] } },
  { name: 'staple_loop_fail_late_tower_contaminated_archive', house: 'stapler_registered', steps: BUREAU.concat(G.review, TO_FLOWER_GRADE, ['interfere_with_translator', 'staple_punch_tape_loop', 'flee_staple_failure', 'run_to_tower_first_visit', 'read_late_tower_archive', 'leave_after_late_records', 'leave_through_public_door']),
    checks: { ch2_stapled_punch_tape: false }, end: 'end_public', e: { group: 'public_concourse', exit: 'sabotage_tower_archives', flags: { office_spore_inundation: true, expansion_orders_seen: true }, has: ['red_stapler'] }, text: { tower_late_entry: /green choking thicket/ } },
  { name: 'clicker_jam', house: 'clicker_martin', steps: BUREAU.concat(G.review, TO_FLOWER_GRADE, ['interfere_with_translator', 'jam_feed_with_clicker', 'flee_clicker_jam', 'run_to_tower_first_visit', 'leave_late_tower', 'leave_through_public_door']),
    end: 'end_public', e: { group: 'public_concourse', exit: 'sabotage_tower_escape', lacks: ['timing_clicker'] } },
  { name: 'rubber_ball_jam', house: 'ball_martin', steps: BUREAU.concat(G.review, TO_FLOWER_TRACE, ['interfere_with_translator', 'jam_feed_with_rubber_ball', 'flee_rubber_jam', 'run_past_visited_tower', 'leave_tower_bypass', 'leave_through_public_door']),
    end: 'end_public', e: { group: 'public_concourse', exit: 'sabotage_tower_bypass', lacks: ['rubber_band_ball'] } }
];

// Antidote treatment routes: spore-infected (or thorn-infected) players at each of the three supply
// sources, by every lifecycle (direct use, read then use, take on close then use from inventory).
const INFECT_SPORE = ['cross_spore_exhibits', 'cross_spore_cloud_direct', 'follow_garden_infected', 'skirt_forest_on_irrigation_grade'].concat(FLOWER);
const INFECT_THORN = ['cross_spore_exhibits', 'take_broken_perimeter', 'cross_broken_grates', 'leave_walkway', 'enter_moving_forest', 'push_through_thorns', 'enter_flower_with_thorn'].concat(FLOWER);
const TO_PUBLIC = ['contest_habitat_order', 'appeal_biological_evidence', 'leave_after_biological_appeal'];
const TO_MAINT = ['interfere_with_translator', 'disconnect_biofeedback_cables', 'choose_recoil_escape', 'take_root_exposed_service_door', 'find_maintenance_service_exit'];
const TO_CUSTOMS = ['accept_seed_courier', 'carry_seeds_to_customs', 'carry_sealed_seeds_out'];
const KIT = {
  public: { at: 'public_exit_staging', open: 'open_public_wall_aid', focus: 'public_kit_focus', readFocus: 'public_kit_read_focus', item: 'botanical_antidote_public',
    direct: 'use_public_from_open_kit', read: 'read_public_expiry', afterRead: 'use_public_after_read', close: 'close_public_kit_and_take', closeRead: 'close_public_read_kit_and_take',
    useCheck: 'ch2_public_inventory_use', directCheck: 'ch2_public_kit_direct', readCheck: 'ch2_public_kit_read_use', handled: 'public_kit_handled', leave: 'leave_through_public_door', end: 'end_public', expiry: '1977' },
  maintenance: { at: 'maintenance_exit_staging', open: 'open_maintenance_aid', focus: 'maintenance_kit_focus', readFocus: 'maintenance_kit_read_focus', item: 'botanical_antidote_maintenance',
    direct: 'use_maintenance_from_open_kit', read: 'read_maintenance_expiry', afterRead: 'use_maintenance_after_read', close: 'close_maintenance_kit_and_take', closeRead: 'close_maintenance_read_kit_and_take',
    useCheck: 'ch2_maintenance_inventory_use', directCheck: 'ch2_maintenance_kit_direct', readCheck: 'ch2_maintenance_kit_read_use', handled: 'maintenance_kit_handled', leave: 'leave_through_maintenance_door', end: 'end_maintenance', expiry: '1969' },
  customs: { at: 'customs_exit', open: 'open_customs_aid', focus: 'customs_kit_focus', readFocus: 'customs_kit_read_focus', item: 'botanical_antidote_customs',
    direct: 'use_customs_from_open_kit', read: 'read_customs_expiry', afterRead: 'use_customs_after_read', close: 'close_customs_kit_and_take', closeRead: 'close_customs_read_kit_and_take',
    useCheck: 'ch2_customs_inventory_use', directCheck: 'ch2_customs_kit_direct', readCheck: 'ch2_customs_kit_read_use', handled: 'customs_kit_handled', leave: 'leave_cargo_checkpoint', end: 'end_customs', expiry: '1981' }
};
const TO_KIT = { public: TO_PUBLIC, maintenance: TO_MAINT, customs: TO_CUSTOMS };
// lifecycle: direct | read | take; infection: spore | thorn; cure: true (pass) / false (fail).
function kitRoute(source, lifecycle, infection, cure) {
  const k = KIT[source];
  const infect = infection === 'thorn' ? INFECT_THORN : INFECT_SPORE;
  const preChecks = infection === 'thorn' ? { ch2_walkway_crossing: true, ch2_thorn_gap: false } : { ch2_spore_direct: false };
  if (source === 'public') preChecks.ch2_biological_appeal = true;
  if (source === 'maintenance') preChecks.ch2_translator_cables = true;
  const kitSteps = lifecycle === 'direct' ? [k.open, k.direct]
    : lifecycle === 'read' ? [k.open, k.read, k.afterRead]
      : [k.open, k.close, { item: k.item, verb: 'use' }];
  const checkId = lifecycle === 'direct' ? k.directCheck : lifecycle === 'read' ? k.readCheck : k.useCheck;
  const checks = Object.assign({}, preChecks, { [checkId]: cure });
  const want = infection === 'thorn' ? { thorn_infected: !cure } : { spore_infected: !cure };
  return { name: 'kit_' + source + '_' + lifecycle + '_' + infection + '_' + (cure ? 'cured' : 'not_cured'), house: 'martin', kit: source, lifecycle, infection, cure,
    steps: BUREAU.concat(G.review, infect, TO_KIT[source], kitSteps, [k.leave]), checks, end: k.end,
    e: { group: source === 'maintenance' ? 'service_infrastructure' : 'public_concourse',
      exit: { public: 'appeal_biological', maintenance: 'translator_root_door', customs: 'courier_carried' }[source],
      lacks: [k.item], flags: Object.assign({ [k.handled]: true }, want) } };
}
const KIT_ROUTES = [];
['public', 'maintenance', 'customs'].forEach((src) => ['direct', 'read', 'take'].forEach((lc) => [true, false].forEach((cure) => KIT_ROUTES.push(kitRoute(src, lc, 'spore', cure)))));
['public', 'maintenance', 'customs'].forEach((src) => [true, false].forEach((cure) => KIT_ROUTES.push(kitRoute(src, 'take', 'thorn', cure))));

// Plays a House entry from a seed: the state standing on the House exit, or null if the seed's
// real rolls do not give that exit.
function houseExit(story, key, seed) {
  const h = HOUSE[key];
  let s;
  try { s = stepAll(story, prologue(story, h.item, seed), h.path); } catch (e) { if (e.missing) return null; throw e; }
  if (s.node !== h.exit) return null;
  if (h.chair && (!s.checks[h.chair] || s.checks[h.chair].ok !== true)) return null;
  if (h.chairFail && (!s.checks[h.chairFail] || s.checks[h.chairFail].ok !== false)) return null;
  for (const [id, ok] of Object.entries(h.checks || {})) if (!s.checks[id] || s.checks[id].ok !== ok) return null;
  return s;
}
function enterChapter2(story, exitState) {
  const card = Rules.view(story, exitState).cards[0];
  return Rules.step(story, exitState, { choice: card.id }).state;
}
// Finds a fixed seed whose real rolls take this route end to end. Returns { seed, exit, entry, end }.
function findSeed(story, route, maxSeed) {
  for (let seed = 1; seed <= (maxSeed || 4000); seed++) {
    const exit = houseExit(story, route.house, seed);
    if (!exit) continue;
    const entry = enterChapter2(story, exit);
    let end;
    try { end = stepAll(story, entry, route.steps); } catch (e) { if (e.missing) continue; throw e; }
    if (end.node !== route.end) continue;
    if (Object.entries(route.checks || {}).some(([id, ok]) => !end.checks[id] || end.checks[id].ok !== ok)) continue;
    return { seed, exit, entry, end };
  }
  return null;
}

module.exports = { Rules, stepAll, prologue, HOUSE, ARRIVAL, ROUTES, KIT, KIT_ROUTES, houseExit, enterChapter2, findSeed, BUREAU, G, FLOWER };
