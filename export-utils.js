// Excel and PDF Export Utilities for Sales CRM
// Uses SheetJS (xlsx) for Excel and jsPDF for PDF generation

class ExportManager {
    constructor() {
        this.companyName = 'Sales Manager CRM';
    }

    // ===== EXCEL EXPORT =====

    /**
     * Export visits data to Excel
     * @param {Array} visits - Array of visit objects
     * @param {String} filename - Output filename
     */
    exportVisitsToExcel(visits, filename = 'visits_report.xlsx') {
        // Prepare data for Excel
        const data = visits.map((visit, index) => ({
            '#': index + 1,
            'Date': new Date(visit.created_at).toLocaleDateString(),
            'Time': new Date(visit.created_at).toLocaleTimeString(),
            'Client Name': visit.client_name,
            'Client Type': visit.client_type,
            'Visit Type': visit.visit_type,
            'Location': visit.location,
            'Notes': visit.notes || '-'
        }));

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(data);

        // Set column widths
        ws['!cols'] = [
            { wch: 5 },  // #
            { wch: 12 }, // Date
            { wch: 10 }, // Time
            { wch: 25 }, // Client Name
            { wch: 15 }, // Client Type
            { wch: 12 }, // Visit Type
            { wch: 30 }, // Location
            { wch: 40 }  // Notes
        ];

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Visits');

        // Add summary sheet
        const summary = this._createVisitSummary(visits);
        const summaryWs = XLSX.utils.json_to_sheet(summary);
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

        // Download
        XLSX.writeFile(wb, filename);
    }

    /**
     * Export targets data to Excel
     * @param {Array} targets - Array of target objects
     * @param {String} filename - Output filename
     */
    exportTargetsToExcel(targets, filename = 'targets_report.xlsx') {
        const data = targets.map((target, index) => {
            const percentage = Math.round((target.achieved / target.target_quantity) * 100);
            return {
                '#': index + 1,
                'Date': target.date,
                'Product': target.product,
                'Target': target.target_quantity,
                'Achieved': target.achieved,
                'Remaining': target.target_quantity - target.achieved,
                'Achievement %': percentage + '%',
                'Status': percentage >= 80 ? 'On Track' : percentage >= 50 ? 'Moderate' : 'Behind'
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [
            { wch: 5 },
            { wch: 12 },
            { wch: 20 },
            { wch: 10 },
            { wch: 10 },
            { wch: 12 },
            { wch: 15 },
            { wch: 12 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Targets');
        XLSX.writeFile(wb, filename);
    }

    /**
     * Export journey summary to Excel
     * @param {Object} journey - Journey object with visits
     * @param {String} filename - Output filename
     */
    exportJourneyToExcel(journey, visits, filename = 'journey_report.xlsx') {
        // Journey Info
        const journeyInfo = [{
            'Journey ID': journey.id,
            'Date': journey.date,
            'Start Time': new Date(journey.start_time).toLocaleTimeString(),
            'End Time': journey.end_time ? new Date(journey.end_time).toLocaleTimeString() : 'Active',
            'Start Location': journey.start_location,
            'End Location': journey.end_location || 'N/A',
            'Total Visits': journey.total_visits || visits.length,
            'Status': journey.status
        }];

        const infoWs = XLSX.utils.json_to_sheet(journeyInfo);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, infoWs, 'Journey Info');

        // Visits during journey
        if (visits && visits.length > 0) {
            const visitsData = visits.map((v, i) => ({
                'Visit #': i + 1,
                'Time': new Date(v.created_at).toLocaleTimeString(),
                'Client': v.client_name,
                'Type': v.client_type,
                'Location': v.location,
                'Visit Type': v.visit_type
            }));

            const visitsWs = XLSX.utils.json_to_sheet(visitsData);
            XLSX.utils.book_append_sheet(wb, visitsWs, 'Visits');
        }

        XLSX.writeFile(wb, filename);
    }

    // ===== PDF EXPORT =====

    /**
     * Export visits data to PDF
     * @param {Array} visits - Array of visit objects
     * @param {String} filename - Output filename
     */
    exportVisitsToPDF(visits, managerName = 'Manager', filename = 'visits_report.pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Header
        this._addPDFHeader(doc, 'Visits Report', managerName);

        // Summary stats
        const summary = this._calculateVisitStats(visits);
        doc.setFontSize(10);
        let yPos = 40;
        doc.text(`Total Visits: ${summary.total}`, 14, yPos);
        doc.text(`Field Visits: ${summary.field}`, 14, yPos + 6);
        doc.text(`Office Visits: ${summary.office}`, 14, yPos + 12);
        doc.text(`Date Range: ${summary.dateRange}`, 14, yPos + 18);

        // Table
        const tableData = visits.map((visit, index) => [
            index + 1,
            new Date(visit.created_at).toLocaleDateString(),
            visit.client_name,
            visit.client_type,
            visit.visit_type,
            visit.location
        ]);

        doc.autoTable({
            startY: yPos + 25,
            head: [['#', 'Date', 'Client', 'Type', 'Visit Type', 'Location']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [13, 148, 136] },
            styles: { fontSize: 8 }
        });

        // Footer
        this._addPDFFooter(doc);

        doc.save(filename);
    }

    /**
     * Export targets data to PDF
     * @param {Array} targets - Array of target objects
     * @param {String} filename - Output filename
     */
    exportTargetsToPDF(targets, managerName = 'Manager', filename = 'targets_report.pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        this._addPDFHeader(doc, 'Targets Report', managerName);

        // Calculate overall achievement
        const totalTarget = targets.reduce((sum, t) => sum + t.target_quantity, 0);
        const totalAchieved = targets.reduce((sum, t) => sum + t.achieved, 0);
        const overallPercentage = Math.round((totalAchieved / totalTarget) * 100);

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Overall Achievement: ${overallPercentage}%`, 14, 40);
        doc.setFont(undefined, 'normal');

        // Table
        const tableData = targets.map((target, index) => {
            const percentage = Math.round((target.achieved / target.target_quantity) * 100);
            return [
                index + 1,
                target.product,
                target.target_quantity,
                target.achieved,
                target.target_quantity - target.achieved,
                percentage + '%'
            ];
        });

        doc.autoTable({
            startY: 50,
            head: [['#', 'Product', 'Target', 'Achieved', 'Remaining', 'Achievement']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [13, 148, 136] },
            styles: { fontSize: 10 },
            columnStyles: {
                5: {
                    cellWidth: 25,
                    halign: 'center',
                    fontStyle: 'bold'
                }
            }
        });

        this._addPDFFooter(doc);
        doc.save(filename);
    }

    /**
     * Export journey summary to PDF
     * @param {Object} journey - Journey object
     * @param {Array} visits - Visits during journey
     * @param {String} filename - Output filename
     */
    exportJourneyToPDF(journey, visits, managerName = 'Manager', filename = 'journey_report.pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        this._addPDFHeader(doc, 'Journey Report', managerName);

        // Journey details
        doc.setFontSize(10);
        let yPos = 40;
        doc.text(`Journey Date: ${journey.date}`, 14, yPos);
        doc.text(`Start Time: ${new Date(journey.start_time).toLocaleTimeString()}`, 14, yPos + 6);
        doc.text(`End Time: ${journey.end_time ? new Date(journey.end_time).toLocaleTimeString() : 'Active'}`, 14, yPos + 12);
        doc.text(`Start Location: ${journey.start_location}`, 14, yPos + 18);
        if (journey.end_location) {
            doc.text(`End Location: ${journey.end_location}`, 14, yPos + 24);
            yPos += 6;
        }
        doc.text(`Total Visits: ${journey.total_visits || visits.length}`, 14, yPos + 30);

        // Visits table
        if (visits && visits.length > 0) {
            const tableData = visits.map((visit, index) => [
                index + 1,
                new Date(visit.created_at).toLocaleTimeString(),
                visit.client_name,
                visit.client_type,
                visit.visit_type
            ]);

            doc.autoTable({
                startY: yPos + 40,
                head: [['#', 'Time', 'Client', 'Type', 'Visit Type']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [13, 148, 136] },
                styles: { fontSize: 9 }
            });
        }

        this._addPDFFooter(doc);
        doc.save(filename);
    }

    // ===== HELPER METHODS =====

    _createVisitSummary(visits) {
        const stats = this._calculateVisitStats(visits);

        return [
            { 'Metric': 'Total Visits', 'Value': stats.total },
            { 'Metric': 'Field Visits', 'Value': stats.field },
            { 'Metric': 'Office Visits', 'Value': stats.office },
            { 'Metric': 'Unique Clients', 'Value': stats.uniqueClients },
            { 'Metric': 'Date Range', 'Value': stats.dateRange }
        ];
    }

    _calculateVisitStats(visits) {
        const field = visits.filter(v => v.visit_type === 'Field Visit').length;
        const office = visits.filter(v => v.visit_type === 'Office Visit').length;
        const uniqueClients = new Set(visits.map(v => v.client_name)).size;

        const dates = visits.map(v => new Date(v.created_at));
        const minDate = new Date(Math.min(...dates)).toLocaleDateString();
        const maxDate = new Date(Math.max(...dates)).toLocaleDateString();

        return {
            total: visits.length,
            field,
            office,
            uniqueClients,
            dateRange: minDate === maxDate ? minDate : `${minDate} - ${maxDate}`
        };
    }

    _addPDFHeader(doc, title, subtitle) {
        // Company name
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 58, 138); // Primary blue
        doc.text(this.companyName, 14, 15);

        // Report title
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(title, 14, 25);

        // Subtitle (manager name)
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(subtitle, 14, 31);

        // Date generated
        const today = new Date().toLocaleDateString();
        doc.text(`Generated: ${today}`, 14, 36);

        // Line separator
        doc.setDrawColor(13, 148, 136);
        doc.setLineWidth(0.5);
        doc.line(14, 37, 196, 37);
    }

    _addPDFFooter(doc) {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);

        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.text(
                `Page ${i} of ${pageCount}`,
                doc.internal.pageSize.getWidth() / 2,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'center' }
            );
        }
    }
}

// Create global instance
window.exportManager = new ExportManager();
