
package com.growmate.growmate.controller;

import com.growmate.growmate.model.Activity;
import com.growmate.growmate.repository.ActivityRepository;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.util.List;

@RestController
@RequestMapping("/api/activities")
@CrossOrigin(origins = "*")
public class ActivityController {

    private final ActivityRepository repository;

    public ActivityController(ActivityRepository repository) {
        this.repository = repository;
    }

    // Get all activities
    @GetMapping
    public List<Activity> getActivities() {
        return repository.findAll();
    }

    // Add activity
    @PostMapping
    public Activity addActivity(@RequestBody Activity activity) {
        return repository.save(activity);
    }

    // Update activity
    @PutMapping("/{id}")
    public ResponseEntity<Activity> updateActivity(
            @PathVariable Long id,
            @RequestBody Activity updatedActivity) {

        return repository.findById(id)
                .map(activity -> {
                    activity.setTitle(updatedActivity.getTitle());
                    activity.setCategory(updatedActivity.getCategory());
                    activity.setDate(updatedActivity.getDate());
                    activity.setDuration(updatedActivity.getDuration());
                    activity.setCompleted(updatedActivity.isCompleted());

                    return ResponseEntity.ok(repository.save(activity));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Delete activity
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteActivity(@PathVariable Long id) {

        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        repository.deleteById(id);
        return ResponseEntity.ok("Activity deleted successfully");
    }
}
