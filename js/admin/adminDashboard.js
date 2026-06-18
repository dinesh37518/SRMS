/**
 * adminDashboard.js – Admin dashboard metrics, activity feed, and quick actions
 */

const AdminDashboard = (() => {

  // ============================================================
  // INIT
  // ============================================================
  const init = () => {
    bindQuickAddButtons();
    bindCSVHandlers();
    bindBackupRestoreHandlers();
    bindSettingsHandlers();
    bindStatCardsLinkage();
    bindActivityLogs();
    
    // Bind refresh button
    document.getElementById('btn-refresh-dashboard')?.addEventListener('click', () => {
      refresh();
      Toast.success('Refreshed', 'Dashboard metrics updated.');
    });
  };

  // ============================================================
  // REFRESH
  // ============================================================
  const refresh = () => {
    const students = Storage.getAllStudents();
    
    // Count stats
    const total = students.length;
    const active = students.filter(s => s.status === 'Active').length;
    const graduated = students.filter(s => s.status === 'Graduated').length;
    const suspended = students.filter(s => s.status === 'Suspended').length;
    const withdrawn = students.filter(s => s.status === 'Withdrawn').length;

    // Animate stats numbers
    Utils.animateNumber(document.getElementById('stat-total'), total);
    Utils.animateNumber(document.getElementById('stat-active'), active);
    Utils.animateNumber(document.getElementById('stat-graduated'), graduated);
    Utils.animateNumber(document.getElementById('stat-suspended'), suspended);
    Utils.animateNumber(document.getElementById('stat-withdrawn'), withdrawn);

    // Calculate trend: % of students registered in last 30 days
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const recent = students.filter(s => {
      const date = new Date(s.enrollmentDate || s.createdAt).getTime();
      return date >= thirtyDaysAgo;
    }).length;
    const trendPct = total > 0 ? Math.round((recent / total) * 100) : 0;
    
    const trendEl = document.getElementById('stat-total-trend');
    if (trendEl) {
      trendEl.innerHTML = `<i class="fas fa-arrow-up"></i><span>+${trendPct}% this month</span>`;
    }

    // Refresh activity lists
    refreshActivityFeeds();
  };

  // ============================================================
  // QUICK ADD BUTTONS
  // ============================================================
  const bindQuickAddButtons = () => {
    const triggers = [
      'qa-add-student',
      'btn-quick-add-student',
      'btn-add-student',
      'btn-empty-add'
    ];
    triggers.forEach(id => {
      document.getElementById(id)?.addEventListener('click', (e) => {
        e.preventDefault();
        StudentForm.openAddModal();
      });
    });
  };

  // ============================================================
  // STAT CARDS LINKAGE TO STUDENT TABLE
  // ============================================================
  const bindStatCardsLinkage = () => {
    Utils.$$('.stat-card[data-status]').forEach(card => {
      card.addEventListener('click', () => {
        const status = card.dataset.status;
        
        // Go to filter-status element
        const statusFilter = document.getElementById('filter-status');
        if (statusFilter) {
          statusFilter.value = status === 'all' ? '' : status;
          // Dispatch change event to trigger studentTable update
          statusFilter.dispatchEvent(new Event('change'));
        }

        // Navigate to student management view by clicking sidebar item
        document.querySelector('.nav-item[data-view="admin-students"]')?.click();
      });
    });
  };

  // ============================================================
  // CSV IMPORT & EXPORT
  // ============================================================
  const bindCSVHandlers = () => {
    const importInput = document.getElementById('csv-import-input');
    
    // Bind triggers to open file input dialog
    const importTriggers = ['qa-import-csv', 'btn-import-csv', 'btn-settings-import'];
    importTriggers.forEach(id => {
      document.getElementById(id)?.addEventListener('click', (e) => {
        e.preventDefault();
        importInput?.click();
      });
    });

    // Handle CSV Import
    importInput?.addEventListener('change', async () => {
      const file = importInput.files[0];
      if (!file) return;

      Loader.show();
      // Brief delay to allow loader to render smoothly
      await new Promise(r => setTimeout(r, 600));

      try {
        const text = await Utils.readFileAsText(file);
        const importedStudents = Utils.csvToStudents(text);

        if (importedStudents.length === 0) {
          throw new Error('No valid student records found in CSV file.');
        }

        let added = 0;
        let updated = 0;
        const defaultHash = Utils.hashPassword('Student@123');

        importedStudents.forEach(student => {
          if (!student.email) return;

          // Double check studentId uniqueness or generate if empty
          let sid = student.studentId;
          if (!sid || Storage.studentIdExists(sid, student.email)) {
            sid = Utils.generateStudentId();
          }

          const existing = Storage.getUser(student.email);
          if (existing) {
            // Update existing student
            Storage.updateUser(student.email, {
              studentId: sid,
              fullName: student.fullName || existing.fullName,
              phone: student.phone || existing.phone,
              dob: student.dob || existing.dob,
              address: student.address || existing.address,
              course: student.course || existing.course,
              yearLevel: student.yearLevel || existing.yearLevel,
              status: student.status || existing.status,
              enrollmentDate: student.enrollmentDate || existing.enrollmentDate,
            });
            updated++;
          } else {
            // Register new student
            const newStudent = {
              role: 'student',
              studentId: sid,
              fullName: student.fullName || 'New Student',
              email: student.email,
              passwordHash: defaultHash,
              phone: student.phone || '',
              dob: student.dob || '',
              address: student.address || '',
              course: student.course || '',
              yearLevel: student.yearLevel || '1',
              status: student.status || 'Active',
              enrollmentDate: student.enrollmentDate || new Date().toISOString().split('T')[0],
              profilePhoto: null,
              activityLog: [{ type: 'create', text: 'Account imported from CSV', timestamp: new Date().toISOString() }],
              createdAt: new Date().toISOString(),
            };
            Storage.saveUser(newStudent);
            added++;
          }
        });

        // Add global activity
        Storage.addActivity({
          type: 'import',
          text: `Admin imported CSV: added <strong>${added}</strong>, updated <strong>${updated}</strong> students`,
        });

        Toast.success('Import Complete', `Successfully added ${added} and updated ${updated} records.`);
        
        // Refresh tables and stats
        refresh();
        StudentTable.refresh();
        StudentTable.populateCourseFilter();

      } catch (err) {
        Toast.error('Import Failed', err.message || 'Error parsing CSV file.');
        console.error(err);
      } finally {
        importInput.value = ''; // Reset input
        Loader.hide();
      }
    });

    // Handle CSV Export
    const exportTriggers = ['qa-export-csv', 'btn-export-csv', 'btn-settings-export'];
    exportTriggers.forEach(id => {
      document.getElementById(id)?.addEventListener('click', (e) => {
        e.preventDefault();
        const students = Storage.getAllStudents();
        if (students.length === 0) {
          Toast.warning('No Records', 'There are no student records to export.');
          return;
        }
        const csvContent = Utils.studentsToCSV(students);
        Utils.downloadFile(csvContent, `srms_students_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
        Toast.success('Export Successful', `Exported ${students.length} student records.`);
      });
    });
  };

  // ============================================================
  // BACKUP & RESTORE JSON
  // ============================================================
  const bindBackupRestoreHandlers = () => {
    const restoreInput = document.getElementById('backup-restore-input');

    // Trigger backup
    const backupTriggers = ['qa-backup', 'btn-settings-backup'];
    backupTriggers.forEach(id => {
      document.getElementById(id)?.addEventListener('click', (e) => {
        e.preventDefault();
        const backupStr = Storage.exportBackup();
        Utils.downloadFile(backupStr, `srms_backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
        Toast.success('Backup Created', 'JSON system backup downloaded successfully.');
      });
    });

    // Trigger restore file input dialog
    const restoreTriggers = ['qa-restore', 'btn-settings-restore'];
    restoreTriggers.forEach(id => {
      document.getElementById(id)?.addEventListener('click', (e) => {
        e.preventDefault();
        restoreInput?.click();
      });
    });

    // Handle JSON Restore file load
    restoreInput?.addEventListener('change', async () => {
      const file = restoreInput.files[0];
      if (!file) return;

      Loader.show();
      await new Promise(r => setTimeout(r, 600));

      try {
        const text = await Utils.readFileAsText(file);
        Storage.importBackup(text);
        Toast.success('Data Restored', 'System data restored successfully.');
        
        // Reload application to cleanly refresh views & login state
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (err) {
        Toast.error('Restore Failed', err.message || 'Invalid or corrupt backup file.');
        console.error(err);
      } finally {
        restoreInput.value = ''; // Reset input
        Loader.hide();
      }
    });
  };

  // ============================================================
  // SETTINGS HANDLERS
  // ============================================================
  const bindSettingsHandlers = () => {
    // Clear all student records button
    document.getElementById('btn-settings-clear')?.addEventListener('click', (e) => {
      e.preventDefault();
      Modal.confirm({
        title: 'Clear All Data',
        message: 'Are you sure you want to clear all student profiles, status records, and log feeds? The administrator account will be preserved. This action cannot be undone.',
        confirmText: 'Clear All Data',
        type: 'danger',
        onConfirm: () => {
          Storage.clearAllData();
          Toast.success('Data Cleared', 'All student data was removed from LocalStorage.');
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        }
      });
    });
  };

  // ============================================================
  // ACTIVITY LOGS
  // ============================================================
  const bindActivityLogs = () => {
    // Clear log button
    document.getElementById('btn-clear-activity')?.addEventListener('click', (e) => {
      e.preventDefault();
      Modal.confirm({
        title: 'Clear Activity Logs',
        message: 'Are you sure you want to clear all recorded system activity logs? This action is permanent.',
        confirmText: 'Clear Logs',
        type: 'danger',
        onConfirm: () => {
          Storage.clearActivity();
          Toast.success('Logs Cleared', 'System activity log wiped.');
          refreshActivityFeeds();
        }
      });
    });

    // View all activity navigation trigger
    document.getElementById('btn-view-all-activity')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelector('.nav-item[data-view="admin-activity"]')?.click();
    });

    // Quick Action Print
    document.getElementById('qa-print')?.addEventListener('click', (e) => {
      e.preventDefault();
      window.print();
    });
  };

  // ============================================================
  // RENDER RECENT & FULL SYSTEM ACTIVITY FEEDS
  // ============================================================
  const refreshActivityFeeds = () => {
    const recentContainer = document.getElementById('recent-activity-list');
    const fullContainer = document.getElementById('full-activity-list');
    const logs = Storage.getActivity();

    const generateHtml = (activities) => {
      if (activities.length === 0) {
        return '<div class="empty-state-sm"><i class="fas fa-inbox"></i><p>No activity yet</p></div>';
      }

      return activities.map(act => {
        let icon = 'fa-info-circle';
        let typeClass = 'info';

        switch (act.type) {
          case 'login':
            icon = 'fa-sign-in-alt';
            typeClass = 'login';
            break;
          case 'create':
            icon = 'fa-user-plus';
            typeClass = 'create';
            break;
          case 'update':
            icon = 'fa-user-edit';
            typeClass = 'update';
            break;
          case 'delete':
            icon = 'fa-user-minus';
            typeClass = 'delete';
            break;
          case 'reset':
            icon = 'fa-key';
            typeClass = 'reset';
            break;
          case 'import':
            icon = 'fa-file-import';
            typeClass = 'import';
            break;
        }

        return `
          <div class="activity-item">
            <div class="activity-icon ${typeClass}"><i class="fas ${icon}"></i></div>
            <div class="activity-content">
              <p class="activity-text">${act.text}</p>
              <span class="activity-time">${Utils.timeAgo(act.timestamp)}</span>
            </div>
          </div>
        `;
      }).join('');
    };

    if (recentContainer) {
      recentContainer.innerHTML = generateHtml(logs.slice(0, 5));
    }
    if (fullContainer) {
      fullContainer.innerHTML = generateHtml(logs);
    }
  };

  return {
    init,
    refresh,
  };
})();
