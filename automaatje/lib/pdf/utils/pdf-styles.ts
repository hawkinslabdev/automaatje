import { StyleSheet } from '@react-pdf/renderer';

// Shared styles for PDF templates
export const commonStyles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 30,
    textAlign: 'right',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 30,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000000',
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableRowEven: {
    backgroundColor: '#FAFAFA',
  },
  tableCell: {
    fontSize: 9,
    color: '#000000',
  },
  tableCellHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#333333',
  },
  tableCellRight: {
    textAlign: 'right',
  },
  metadata: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  metadataRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  metadataLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    width: 100,
    color: '#000000',
  },
  metadataValue: {
    fontSize: 10,
    color: '#000000',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    fontSize: 9,
    color: '#666666',
  },
  totalRow: {
    backgroundColor: '#F0F0F0',
    fontWeight: 'bold',
  },
});
