# repcounter.py

class ProcessStatefromAngle:
    def __init__(self):
        self.Reps_Count_joint = "Elbow_Angle"
        self.state_tracker = {
            'state_seq': [],
            'prev_state': 0,
            'curr_state': 0,
            'REPETITIONS': 0,
            'GENERAL_COUNT': 0,
            'IMPROPER_MOVE': 0
        }

    def _update_state_sequence(self, state):
        seq = self.state_tracker['state_seq']
        if state == 1:
            self.state_tracker['state_seq'] = [1]
        elif state == 2:
            if (3 not in seq and seq.count(2) == 0) or (3 in seq and seq.count(2) == 1):
                seq.append(2)
        elif state == 3:
            if 2 in seq and 3 not in seq:
                seq.append(3)
        if seq == [1, 2, 3]:
            self.state_tracker['REPETITIONS'] += 1
            self.state_tracker['state_seq'] = []
        return self.state_tracker['REPETITIONS']

    def _get_state(self, joint_angle):
        state = None
        if self.Reps_Count_joint == "Elbow_Angle":
            if 40 <= joint_angle <=90:
                state = 1
            elif 91<= joint_angle <= 110:
                state = 2
            elif 111 <= joint_angle <= 130:
                state = 3
        self.state_tracker['curr_state'] = state if state else 0
        return state if state else 0

    def update(self, joint_angle):
        state = self._get_state(joint_angle)
        reps = self._update_state_sequence(state)
        return reps
    
    def reset(self):
        """
        Reset the state tracker to initial values.
        """
        self.state_tracker = {
            'state_seq': [],
            'prev_state': 0,
            'curr_state': 0,
            'REPETITIONS': 0,
            'GENERAL_COUNT': 0,
            'IMPROPER_MOVE': 0
        }

# Globale Instanz
repetition_counter = ProcessStatefromAngle()

#  http://localhost:8000/greeting
